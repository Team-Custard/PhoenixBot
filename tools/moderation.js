// Shared helpers for moderation commands: permission/hierarchy checks, case
// creation, mod-log messages and DM notices. Every moderation command used to
// carry its own copy of this logic (twice, once for slash and once for prefix).
const { EmbedBuilder, Colors } = require("discord.js");
const ms = require("ms");
const Case = require("./models/Case");
const { emoji } = require("./errorReporter");

/** Discord's maximum timeout length (28 days). */
const MAX_TIMEOUT = 28 * 24 * 60 * 60 * 1000;

/** Parses a duration like "5h" or "2d". Returns milliseconds, or null if invalid. */
function parseDuration(input) {
  if (input === null || input === undefined || input === "") return null;
  const value = typeof input === "number" ? input : ms(String(input));
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/** Human readable duration ("2 hours"), or the fallback when there's no duration. */
async function formatDuration(duration, fallback = "Permanent") {
  if (!duration) return fallback;
  // Team Custard's pretty-ms fork is CommonJS and returns a promise.
  return require("pretty-ms")(duration, { verbose: true });
}

/**
 * Checks whether the moderator (and the bot) can act on a member.
 * @param {import("discord.js").GuildMember} moderator
 * @param {import("discord.js").GuildMember} target
 * @param {"kick"|"ban"|"moderate"|"manage"} [action]
 * @returns {string|null} An error message, or null when allowed.
 */
function checkHierarchy(moderator, target, action = "manage") {
  const guild = target.guild;
  const me = guild.members.me;
  if (target.id === moderator.id) return `${emoji("error")} You can't use this on yourself.`;
  if (target.id === me.id) {
    return `${emoji("error")} You're so mean... After everything I've ever done for you this is how I get treated? What's wrong with you man...`;
  }
  if (target.id === guild.ownerId) return `${emoji("error")} You can't moderate the server owner.`;
  if (target.roles.highest.position >= me.roles.highest.position) {
    return `${emoji("error")} I'm not high enough in the role hierarchy to moderate this member.`;
  }
  if (moderator.id !== guild.ownerId && target.roles.highest.position >= moderator.roles.highest.position) {
    return `${emoji("error")} You aren't high enough in the role hierarchy to moderate this member.`;
  }
  const allowed = {
    kick: target.kickable,
    ban: target.bannable,
    moderate: target.moderatable,
    manage: target.manageable,
  }[action];
  if (!allowed) return `${emoji("error")} This user is not ${{ kick: "kickable", ban: "bannable", moderate: "moderatable", manage: "manageable" }[action]}.`;
  return null;
}

/**
 * Creates a moderation case with an atomically assigned case number.
 * @param {string} guildId
 * @param {object} data
 */
function openCase(guildId, data) {
  return Case.open(guildId, {
    expiretime: 0,
    expired: false,
    hidden: false,
    ...data,
    reason: data.reason || "No reason specified",
  });
}

/** Unix seconds when a punishment with the given duration ends (0 = never). */
function expiryFromNow(duration) {
  return duration ? Math.round(Date.now() / 1000) + Math.round(duration / 1000) : 0;
}

async function fetchModlogChannel(guild, settings) {
  const channelId = settings?.logging?.infractions;
  if (!channelId) return undefined;
  return guild.channels.fetch(channelId).catch(() => undefined);
}

/**
 * Builds the mod-log embed for a case.
 * @param {object} caseDoc
 * @param {object} details
 * @param {string} [details.moderator] Display text for the moderator (defaults to a mention).
 * @param {number|null} [details.duration] Show a duration line (null = permanent, undefined = no line).
 * @param {string[]} [details.extra] Extra lines appended to the description.
 */
async function buildModlogEmbed(caseDoc, details = {}) {
  const lines = [
    `**Offender:** <@${caseDoc.member}>`,
    `**Moderator:** ${details.moderator ?? `<@${caseDoc.moderator}>`}`,
  ];
  if (details.duration !== undefined) lines.push(`**Duration:** ${await formatDuration(details.duration)}`);
  lines.push(`**Reason:** ${caseDoc.reason}`);
  if (details.extra) lines.push(...details.extra);
  return new EmbedBuilder()
    .setTitle(`${caseDoc.punishment} - Case ${caseDoc.caseId}`)
    .setDescription(lines.join("\n"))
    .setColor(Colors.Orange)
    .setFooter({ text: `ID ${caseDoc.member}` })
    .setTimestamp(new Date());
}

/**
 * Posts a case to the server's infraction log channel and stores the message id on the case.
 * @returns {Promise<import("discord.js").Message|undefined>}
 */
async function sendModlog(guild, settings, caseDoc, details = {}) {
  const channel = await fetchModlogChannel(guild, settings);
  if (!channel) return undefined;
  const message = await channel
    .send({ embeds: [await buildModlogEmbed(caseDoc, details)] })
    .catch((err) => {
      console.error(`[error] Error on sending to the modlog channel`, err);
      return undefined;
    });
  if (message) {
    caseDoc.modlogID = message.id;
    await caseDoc.save().catch((err) => console.error(`[error] Failed to save modlog id`, err));
  }
  return message;
}

/**
 * Edits an existing mod-log message for a case (after a reason change, pardon or expiry).
 * @param {object} [details] When given, the whole embed is rebuilt; otherwise only the title is updated.
 */
async function updateModlog(guild, settings, caseDoc, details) {
  if (!caseDoc.modlogID) return undefined;
  const channel = await fetchModlogChannel(guild, settings);
  if (!channel) return undefined;
  const message = await channel.messages.fetch(caseDoc.modlogID).catch(() => undefined);
  if (!message) return undefined;
  const embed = details
    ? await buildModlogEmbed(caseDoc, details)
    : new EmbedBuilder(message.embeds[0]?.data ?? {}).setTitle(`${caseDoc.punishment} - Case ${caseDoc.caseId}`);
  return message.edit({ embeds: [embed] }).catch((err) => {
    console.error(`[error] Error editing the modlog message`, err);
    return undefined;
  });
}

/**
 * DMs a user about a case. Awaited, so the returned boolean is accurate.
 * @param {import("discord.js").User|import("discord.js").GuildMember} user
 * @param {import("discord.js").Guild} guild
 * @param {object} notice
 * @param {string} notice.title
 * @param {string} notice.intro First line, e.g. "You have been kicked from **Server**."
 * @param {object} notice.caseDoc
 * @param {boolean} [notice.hideMod]
 * @param {number|null} [notice.duration] Include a duration line (undefined = no line).
 * @param {import("discord.js").EmbedBuilder[]} [notice.extraEmbeds]
 * @param {import("discord.js").ActionRowBuilder[]} [notice.components]
 */
async function notifyUser(user, guild, notice) {
  const lines = [
    notice.intro,
    `**Case: \` ${notice.caseDoc.caseId} \`**`,
    `**Moderator:** ${notice.hideMod ? "Hidden" : `<@!${notice.caseDoc.moderator}>`}`,
  ];
  if (notice.duration !== undefined) {
    lines.push(`**Duration:** ${notice.duration && notice.duration <= MAX_TIMEOUT ? await formatDuration(notice.duration) : "Permanent"}`);
  }
  lines.push(`**Reason:** ${notice.caseDoc.reason || "No reason was provided"}`);

  const embed = new EmbedBuilder()
    .setTitle(notice.title)
    .setDescription(lines.join("\n"))
    .setFooter({ text: guild.name, iconURL: guild.iconURL() ?? undefined })
    .setColor(Colors.Orange);

  return user
    .send({ embeds: [embed, ...(notice.extraEmbeds ?? [])], components: notice.components ?? [] })
    .then(() => true)
    .catch(() => false);
}

/**
 * Logs an automatic action (no case is created) to the infraction log channel.
 * @param {import("discord.js").Guild} guild
 * @param {object} settings
 * @param {object} entry
 * @param {string} entry.title e.g. "Kick (Automatic)"
 * @param {string} entry.memberId
 * @param {string} entry.reason
 */
async function sendAutomodLog(guild, settings, { title, memberId, reason }) {
  const channel = await fetchModlogChannel(guild, settings);
  if (!channel) return undefined;
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(`**Offender:** <@${memberId}>\n**Moderator:** ${guild.client.user}\n**Reason:** ${reason}`)
    .setColor(Colors.Orange)
    .setFooter({ text: `ID ${memberId}` })
    .setTimestamp(new Date());
  return channel.send({ embeds: [embed] }).catch((err) => {
    console.error(`[error] Error on sending to the modlog channel`, err);
    return undefined;
  });
}

/** Shorthand for "(Ban by user | 1h) reason" audit log reasons. */
function auditReason(action, moderatorUser, reason, duration) {
  return `(${action} by ${moderatorUser.tag ?? moderatorUser.username}${duration ? ` | ${ms(duration)}` : ""}) ${reason || "No reason specified"}`.slice(0, 512);
}

/** Looks up a user's tag for display without hitting the API when possible. */
async function displayUser(client, userId) {
  const user = client.users.cache.get(userId) ?? (await client.users.fetch(userId).catch(() => undefined));
  return user ? user.tag : userId;
}

module.exports = {
  MAX_TIMEOUT,
  Case,
  parseDuration,
  formatDuration,
  checkHierarchy,
  openCase,
  expiryFromNow,
  buildModlogEmbed,
  sendModlog,
  updateModlog,
  sendAutomodLog,
  notifyUser,
  auditReason,
  displayUser,
};
