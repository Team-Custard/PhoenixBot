// Punishments Phoenix hands out by itself: automod filters, Discord AutoMod rules
// and the warn punishment system. Each one opens a case (moderator = Phoenix),
// DMs the member and posts to the mod log, the same as a moderator using a command.
const { EmbedBuilder, Colors } = require("discord.js");
const { container } = require("@sapphire/framework");
const mod = require("./moderation");
const { emoji } = require("./errorReporter");

const ACTIONS = ["warn", "mute", "kick", "ban"];
const CASE_NAMES = { warn: "Warn", mute: "Mute", kick: "Kick", ban: "Ban", shadowban: "Shadowban" };

/** Whether Phoenix is able to do this to the member at all. */
function canPunish(member, action) {
  if (!member || member.id === member.guild.ownerId || member.user.bot) return false;
  switch (action) {
    case "warn": return true;
    case "mute": return member.moderatable || member.manageable;
    case "kick": return member.kickable;
    case "ban": return member.bannable;
    case "shadowban": return member.manageable;
    default: return false;
  }
}

/**
 * Carries out the action itself. Returns false if it couldn't be done.
 * @param {import("discord.js").GuildMember} member
 */
async function carryOut(member, settings, action, duration, audit) {
  switch (action) {
    case "mute":
      if (duration && duration <= mod.MAX_TIMEOUT && member.moderatable) {
        await member.disableCommunicationUntil(Date.now() + duration, audit);
        return true;
      }
      if (settings.moderation?.muteRole) {
        await member.roles.add(settings.moderation.muteRole, audit);
        return true;
      }
      return false;
    case "kick":
      await member.kick(audit);
      return true;
    case "ban":
      await member.ban({ reason: audit, deleteMessageSeconds: 60 * 60 });
      return true;
    case "shadowban": {
      const role = settings.moderation?.shadowBannedRole;
      if (!role) return false;
      settings.moderation.shadowbannedUsers.push({
        user: member.id,
        roles: member.roles.cache.filter((r) => r.id !== member.guild.id).map((r) => r.id),
      });
      await member.roles.set([role], audit);
      await settings.save();
      return true;
    }
    default:
      return false;
  }
}

/**
 * Punishes a member as Phoenix.
 * @param {object} options
 * @param {import("discord.js").GuildMember} options.member
 * @param {object} options.settings The server's settings document.
 * @param {"warn"|"mute"|"kick"|"ban"|"shadowban"} options.action
 * @param {number} [options.duration] For mutes and bans, in milliseconds.
 * @param {string} options.reason Shown in the case, DM and audit log.
 * @param {string} [options.source] e.g. "Automod", shown in the audit log.
 * @param {boolean} [options.applySystem] Run the punishment system after a warn.
 * @returns {Promise<{ ok: boolean, caseDoc?: object, followUp?: object }>}
 */
async function punish({ member, settings, action, duration = null, reason, source = "Automod", applySystem = true }) {
  const guild = member.guild;
  const client = container.client;
  if (!canPunish(member, action)) return { ok: false };
  duration = action === "mute" || action === "ban" ? duration || null : null;
  const audit = `(${source}) ${reason}`.slice(0, 512);

  if (action === "warn") {
    const caseDoc = await mod.openCase(guild.id, {
      punishment: "Warn",
      member: member.id,
      moderator: client.user.id,
      reason: `(${source}) ${reason}`,
    });
    const warnings = await mod.Case.countWarnings(guild.id, member.id);
    const step = applySystem ? systemStep(settings, warnings) : null;
    await mod.notifyUser(member, guild, {
      title: `${emoji("warning")} Warning received!`,
      intro: `You were automatically warned in **${guild.name}**. You now have ${warnings} warnings.`,
      caseDoc,
      extraEmbeds: step ? [await stepEmbed(step)] : [],
    });
    await mod.sendModlog(guild, settings, caseDoc, { moderator: `${client.user}` });
    const followUp = step ? await applySystemStep(member, settings, step) : undefined;
    return { ok: true, caseDoc, followUp };
  }

  const caseDoc = await mod.openCase(guild.id, {
    punishment: CASE_NAMES[action],
    member: member.id,
    moderator: client.user.id,
    reason: `(${source}) ${reason}`,
    expiretime: mod.expiryFromNow(duration),
  });
  const notice = {
    title: `${emoji("warning")} ${CASE_NAMES[action]} received`,
    intro: `You were automatically ${{ mute: "muted", kick: "kicked", ban: "banned", shadowban: "restricted" }[action]} in **${guild.name}**.`,
    caseDoc,
    duration: action === "mute" || action === "ban" ? duration : undefined,
  };
  // DM before kicking or banning, while the member still shares a server with Phoenix.
  const leaves = action === "kick" || action === "ban";
  let notified = leaves ? await mod.notifyUser(member, guild, notice) : false;

  let done = false;
  try {
    done = await carryOut(member, settings, action, duration, audit);
  }
  catch (err) {
    console.log(`[punish] ${action} failed in ${guild.id}`, err?.message ?? err);
  }
  if (!done) {
    // Keep the case number, but don't let it count as a real punishment.
    caseDoc.punishment = `${CASE_NAMES[action]} (failed)`;
    caseDoc.expired = true;
    await caseDoc.save().catch(() => undefined);
    return { ok: false };
  }
  if (!leaves) notified = await mod.notifyUser(member, guild, notice);

  if (action === "ban" && duration) {
    const { scheduleMemberTask } = require("./tasks");
    await scheduleMemberTask("tempBan", { guildid: guild.id, memberid: member.id, caseid: caseDoc.caseId }, duration);
  }
  await mod.sendModlog(guild, settings, caseDoc, { moderator: `${client.user}`, duration });
  return { ok: true, caseDoc, notified };
}

/** The punishment system step for this many warnings, if there is one. */
function systemStep(settings, warnings) {
  return settings.moderation?.system?.find((s) => Number(s.warnings) === warnings) ?? null;
}

async function stepEmbed(step) {
  const duration = step.duration > 0 ? step.duration : null;
  return new EmbedBuilder()
    .setTitle("Punishment system")
    .setDescription(`You have reached **${step.warnings}** warnings. You have received a ${step.punishment.toLowerCase()}${duration ? ` for ${await mod.formatDuration(duration)}` : ""}.`)
    .setColor(Colors.Orange);
}

/**
 * Carries out a punishment system step ("on 3 warnings, mute for 1h").
 * Returns the result of the punishment, or { ok: false }.
 */
async function applySystemStep(member, settings, step) {
  const action = step.punishment.toLowerCase();
  const duration = step.duration > 0 ? step.duration : null;
  if (!canPunish(member, action)) return { ok: false };
  const audit = `(Punishment system) Reached ${step.warnings} active warnings.`;
  try {
    if (!(await carryOut(member, settings, action, duration, audit))) return { ok: false };
  }
  catch (err) {
    console.log(`[punish] Punishment system step failed`, err?.message ?? err);
    return { ok: false };
  }
  const client = container.client;
  const caseDoc = await mod.openCase(member.guild.id, {
    punishment: step.punishment,
    member: member.id,
    moderator: client.user.id,
    reason: `(Automod) Reached ${step.warnings} active warnings.`,
    expiretime: mod.expiryFromNow(duration),
  });
  if (action === "ban" && duration) {
    const { scheduleMemberTask } = require("./tasks");
    await scheduleMemberTask("tempBan", { guildid: member.guild.id, memberid: member.id, caseid: caseDoc.caseId }, duration);
  }
  await mod.sendModlog(member.guild, settings, caseDoc, { moderator: `${client.user}`, duration });
  return { ok: true, caseDoc };
}

module.exports = { ACTIONS, punish, canPunish, systemStep, stepEmbed, applySystemStep };
