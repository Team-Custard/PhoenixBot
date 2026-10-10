// Shared helpers for the server log listeners (listeners/logging/*). Every listener
// used to repeat the same ~40 lines: load settings, fetch the log channel, find its
// webhook, build an author block, look up the audit log and send.
const { container } = require("@sapphire/framework");
const { EmbedBuilder, Colors } = require("discord.js");
const { peekSettings } = require("./guildSettings");
const webhookFetch = require("./webhookFetch");

/**
 * Returns the configured log channel id for a log type, or null when that log is off.
 * @param {object|null} settings
 * @param {"members"|"users"|"messages"|"moderation"|"infractions"|"automod"|"roles"|"voice"|"commands"|"verification"} type
 */
function logChannelId(settings, type) {
  return settings?.logging?.[type] || null;
}

/** True when message logs should skip this channel (or its category / parent channel). */
function isIgnoredChannel(settings, channel) {
  const ignored = settings?.logging?.msgignorechannels ?? [];
  return ignored.includes(channel?.id) || ignored.includes(channel?.parentId);
}

/**
 * Sends a log entry to a server's log channel through the bot's webhook.
 * @param {import("discord.js").Guild} guild
 * @param {string} type The log type (see logChannelId).
 * @param {import("discord.js").WebhookMessageCreateOptions} payload
 * @param {object} [settings] Already-loaded settings, to avoid a second lookup.
 */
async function sendLog(guild, type, payload, settings) {
  settings ??= await peekSettings(guild.id);
  const channelId = logChannelId(settings, type);
  if (!channelId) return undefined;
  // Fetch through the guild so a channel id from another server can't be used.
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel) return undefined;
  return webhookFetch.send(channel, {
    ...webhookIdentity(guild),
    allowedMentions: { parse: [] },
    ...payload,
  });
}

/**
 * The name and avatar log webhooks post with: the bot's nickname and server avatar
 * in that server (set on the dashboard), falling back to its normal profile.
 * @param {import("discord.js").Guild} guild
 */
function webhookIdentity(guild) {
  const client = container.client;
  const me = guild?.members?.me;
  let username = me?.nickname?.trim() || client.user.username;
  // Discord rejects webhook names containing these words.
  if (/discord|clyde/i.test(username) || username.length > 80) username = client.user.username;
  const avatarURL = (me ?? client.user).displayAvatarURL({ extension: "png", size: 512 });
  return { username, avatarURL };
}

/** A standard orange log embed with the user as the author. */
function logEmbed(user, description) {
  const embed = new EmbedBuilder().setColor(Colors.Orange).setTimestamp(new Date());
  if (user) embed.setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ size: 256 }) });
  if (description) embed.setDescription(truncate(description, 4096));
  return embed;
}

/**
 * Finds who did something from the audit log, if it happened in the last few seconds.
 * @param {import("discord.js").Guild} guild
 * @param {import("discord.js").AuditLogEvent} type
 * @param {string} targetId
 * @param {object} [options]
 * @param {boolean} [options.allowSelf] Count entries where the target did it to themselves.
 * @returns {Promise<{ executor: import("discord.js").User, reason: string|null }|null>}
 */
async function findExecutor(guild, type, targetId, { allowSelf = false } = {}) {
  if (!guild.members.me?.permissions.has("ViewAuditLog")) return null;
  const logs = await guild.fetchAuditLogs({ type, limit: 1 }).catch(() => null);
  const entry = logs?.entries.first();
  if (!entry || entry.targetId !== targetId) return null;
  if (!allowSelf && entry.executorId === targetId) return null;
  if (Date.now() - entry.createdTimestamp > 5000) return null;
  const executor = entry.executor ?? (await container.client.users.fetch(entry.executorId).catch(() => null));
  return executor ? { executor, reason: entry.reason } : null;
}

/** Adds "by <executor>" footer details to a log embed. */
function withExecutor(embed, executor) {
  return embed.setFooter({ text: executor.username, iconURL: executor.displayAvatarURL({ size: 256 }) });
}

/** "3 days", "5 hours"... for how long something lasted. */
function timeDifference(later, earlier) {
  const elapsed = later - earlier;
  const units = [
    ["year", 365 * 24 * 60 * 60 * 1000],
    ["month", 30 * 24 * 60 * 60 * 1000],
    ["day", 24 * 60 * 60 * 1000],
    ["hour", 60 * 60 * 1000],
    ["minute", 60 * 1000],
  ];
  for (const [name, size] of units) {
    if (elapsed >= size) {
      const value = Math.round(elapsed / size);
      return `${value} ${name}${value === 1 ? "" : "s"}`;
    }
  }
  return `${Math.max(0, Math.round(elapsed / 1000))} seconds`;
}

function truncate(text, max) {
  if (!text) return text;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

module.exports = {
  logChannelId,
  isIgnoredChannel,
  sendLog,
  webhookIdentity,
  logEmbed,
  findExecutor,
  withExecutor,
  timeDifference,
  truncate,
};
