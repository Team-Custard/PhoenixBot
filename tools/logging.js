// Shared helpers for the server log listeners (listeners/logging/*). Every listener
// used to repeat the same ~40 lines: load settings, fetch the log channel, find its
// webhook, build an author block, look up the audit log and send.
const { container } = require("@sapphire/framework");
const { EmbedBuilder, Colors } = require("discord.js");
const { peekSettings } = require("./guildSettings");
const webhookFetch = require("./webhookFetch");
const { queue } = require("./queue");

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
 * Plain embed entries for the same channel are grouped into one message (up to 10
 * embeds) for a moment, so a burst of events, like a purge or a raid, takes a few
 * requests instead of hundreds. Everything goes through the send queue.
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
  const batchable = payload.embeds?.length && Object.keys(payload).every((key) => key === "embeds" || key === "allowedMentions");
  if (batchable) return addToBatch(guild, channel, payload.embeds);
  // Send any waiting entries first, so the log stays in order.
  flush(channel.id);
  return queue.run(channel.id, () => webhookFetch.send(channel, { ...webhookIdentity(guild), allowedMentions: { parse: [] }, ...payload }), { maxBacklog: LOG_BACKLOG });
}

const BATCH_WAIT = 1_500;
// Logs matter most during raids and mass bans, so they can queue up much further than
// other messages before anything is dropped.
const LOG_BACKLOG = 1_000;
const MAX_EMBEDS = 10;
// Discord allows 6000 characters across a message's embeds.
const MAX_CHARS = 5_500;
const batches = new Map();

function embedLength(embed) {
  const data = typeof embed.toJSON === "function" ? embed.toJSON() : embed;
  return [data.title, data.description, data.author?.name, data.footer?.text, ...(data.fields ?? []).flatMap((f) => [f.name, f.value])]
    .reduce((sum, part) => sum + (part?.length ?? 0), 0);
}

function addToBatch(guild, channel, embeds) {
  return new Promise((resolve) => {
    for (const embed of embeds) {
      const length = embedLength(embed);
      let batch = batches.get(channel.id);
      if (batch && (batch.embeds.length >= MAX_EMBEDS || batch.chars + length > MAX_CHARS)) {
        flush(channel.id);
        batch = null;
      }
      if (!batch) {
        batch = { guild, channel, embeds: [], chars: 0, waiting: [], timer: setTimeout(() => flush(channel.id), BATCH_WAIT) };
        batches.set(channel.id, batch);
      }
      batch.embeds.push(embed);
      batch.chars += length;
    }
    batches.get(channel.id)?.waiting.push(resolve);
  });
}

function flush(channelId) {
  const batch = batches.get(channelId);
  if (!batch) return;
  batches.delete(channelId);
  clearTimeout(batch.timer);
  const sendEmbeds = (embeds) => webhookFetch.send(batch.channel, { ...webhookIdentity(batch.guild), allowedMentions: { parse: [] }, embeds });
  queue
    .run(channelId, async () => {
      const message = await sendEmbeds(batch.embeds);
      // One bad entry fails the whole message; send them one by one so only it is lost.
      if (!message && batch.embeds.length > 1) {
        let last;
        for (const embed of batch.embeds) last = (await sendEmbeds([embed])) ?? last;
        return last;
      }
      return message;
    }, { maxBacklog: LOG_BACKLOG })
    .catch(() => undefined)
    .then((message) => batch.waiting.forEach((resolve) => resolve(message)));
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
