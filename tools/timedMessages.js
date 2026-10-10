// Timed messages: posted in a channel every so often (set on the dashboard).
// Every cluster checks once a minute for its own servers' timed messages that are due.
const crypto = require("crypto");
const { container } = require("@sapphire/framework");
const ServerSettings = require("./SettingsSchema");
const TimedState = require("./models/TimedState");
const { buildMessage, contextFrom } = require("./placeholders");
const { send } = require("./queue");
const { yieldsToStaging } = require("./staging");

const TICK = 60_000;
const MIN_INTERVAL = 5 * 60_000;
const FIRST_DELAY = 60_000;

// channel id -> when someone (not a bot) last talked there. Fed by listeners/messages/activity.js.
const activity = new Map();
// state key -> { lastSentAt: number, nextAt: number }
const timers = new Map();
let interval = null;

function noteActivity(channelId, at = Date.now()) {
  activity.set(channelId, at);
  if (activity.size > 200_000) activity.delete(activity.keys().next().value);
}

/** A timed message's identity: editing it (or its interval) starts its timer over. */
function keyFor(guildId, entry, botId = container.client?.user?.id ?? "") {
  const hash = crypto.createHash("sha1").update(JSON.stringify([botId, entry.channel, entry.interval, entry.content ?? "", entry.embed ?? ""])).digest("hex").slice(0, 16);
  return `${guildId}:${hash}`;
}

/**
 * Whether a timed message should be posted now, and when to look again.
 * @returns {{ post: boolean, nextAt: number }}
 */
function decide(entry, state, now, lastActivity) {
  const every = Math.max(MIN_INTERVAL, entry.interval ?? 0);
  if (now < state.nextAt) return { post: false, nextAt: state.nextAt };
  // "Only when people are talking": skip this round if nobody spoke since the last post.
  if (entry.onlyWhenActive && !(lastActivity > (state.lastSentAt ?? 0))) return { post: false, nextAt: now + every };
  return { post: true, nextAt: now + every };
}

async function tick() {
  const client = container.client;
  if (!client?.isReady()) return;
  const docs = await ServerSettings.find({ "timedMessages.0": { $exists: true } }).select("timedMessages embeds").lean().catch(() => []);
  const now = Date.now();
  const seen = new Set();
  for (const doc of docs) {
    const guild = client.guilds.cache.get(doc._id);
    // another cluster's server
    if (!guild) continue;
    if (await yieldsToStaging(guild)) continue;
    for (const entry of doc.timedMessages) {
      if (entry.enabled === false || !entry.channel) continue;
      const key = keyFor(guild.id, entry);
      seen.add(key);
      let state = timers.get(key);
      if (!state) {
        const saved = await TimedState.findById(key).lean().catch(() => null);
        const lastSentAt = saved?.lastSentAt ? new Date(saved.lastSentAt).getTime() : 0;
        state = { lastSentAt, nextAt: lastSentAt ? lastSentAt + Math.max(MIN_INTERVAL, entry.interval) : now + FIRST_DELAY };
        timers.set(key, state);
      }
      const { post, nextAt } = decide(entry, state, now, activity.get(entry.channel));
      state.nextAt = nextAt;
      if (!post) continue;
      const channel = guild.channels.cache.get(entry.channel);
      if (!channel?.isTextBased?.()) continue;
      const payload = buildMessage(doc, entry, contextFrom({ guild, channel }));
      if (!payload) continue;
      state.lastSentAt = now;
      send(channel, { ...payload, allowedMentions: { parse: [] } });
      TimedState.updateOne({ _id: key }, { $set: { guildId: guild.id, lastSentAt: new Date(now) } }, { upsert: true }).catch(() => undefined);
    }
  }
  // Forget timers for timed messages that were removed or changed.
  for (const key of timers.keys()) if (!seen.has(key)) timers.delete(key);
}

function startTimedMessages() {
  if (interval) return;
  interval = setInterval(() => tick().catch((err) => console.error("[timed] Tick failed", err?.message ?? err)), TICK);
  interval.unref?.();
}

module.exports = { startTimedMessages, noteActivity, decide, keyFor, MIN_INTERVAL };
