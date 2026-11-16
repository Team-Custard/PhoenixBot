// The notifications module: posts in a channel when someone goes live or posts on
// YouTube, Twitch, Bluesky, X, Reddit or an RSS feed. Servers pick accounts on the
// dashboard (Notifications page). Each account is checked once for every server that
// follows it (tools/models/NotificationFeed.js), on cluster 0 only.
const { container } = require("@sapphire/framework");
const { Routes } = require("discord.js");
const NotificationFeed = require("../models/NotificationFeed");
const { PROVIDERS, AccountError, feedKey } = require("./providers");

const TICK = 60_000;
const MAX_SEEN = 60;
const MAX_ANNOUNCED_PER_CHECK = 3;
const UPCOMING_FOR = 7 * 86_400;

const DEFAULT_MESSAGES = {
  live: "**{{creator}}** is live on {{platform}}! **{{title}}**\n{{link}}",
  upload: "**{{creator}}** posted a new video: **{{title}}**\n{{link}}",
  post: "**{{creator}}** posted on {{platform}}\n{{link}}",
};

let timer = null;
let running = false;

/** "all", "live" or "posts": which events a server wants from one account. */
function wants(row, kind) {
  const events = row.events || "all";
  if (events === "all") return true;
  if (events === "live") return kind === "live";
  return kind !== "live";
}

/**
 * Makes the server's followed accounts match its settings (after a dashboard save).
 * @param {string} guildId
 * @param {object[]} rows settings.notifications
 */
async function syncGuild(guildId, rows) {
  const keys = new Set();
  for (const row of rows ?? []) {
    if (row.enabled === false) continue;
    try {
      keys.add(feedKey(row.platform, row.account));
    }
    catch {
      // Bad accounts are refused when saving; skip any that slipped through.
    }
  }
  await NotificationFeed.updateMany({ guilds: guildId, _id: { $nin: [...keys] } }, { $pull: { guilds: guildId } });
  for (const key of keys) {
    const [platform, ...rest] = key.split(":");
    await NotificationFeed.updateOne(
      { _id: key },
      { $addToSet: { guilds: guildId }, $setOnInsert: { platform, account: rest.join(":"), primed: false, lastChecked: 0 } },
      { upsert: true },
    );
  }
  // Nobody follows these anymore.
  await NotificationFeed.deleteMany({ guilds: { $size: 0 } });
}

/**
 * Works out what's new for one account since the last check.
 * @returns {{ events: object[], update: object }}
 */
async function diff(feed, result) {
  const provider = PROVIDERS[feed.platform];
  const now = Math.floor(Date.now() / 1000);
  const seen = new Set(feed.seen ?? []);
  const update = { name: result.name ?? feed.name, resolvedId: result.resolvedId ?? feed.resolvedId, lastError: null, errorCount: 0 };
  const events = [];
  const base = { creator: update.name || feed.account, platform: provider.label };

  // New posts or videos, oldest first. The first check only learns what's there.
  const fresh = result.items.filter((item) => !seen.has(item.id));
  let pending = (feed.pending ?? []).filter((p) => p.until > now);
  if (feed.primed && fresh.length) {
    let toAnnounce = fresh.slice(0, MAX_ANNOUNCED_PER_CHECK).reverse();
    // YouTube: with an API key, live streams and scheduled streams aren't uploads.
    if (feed.platform === "youtube") {
      const states = await provider.videoStates([...toAnnounce.map((i) => i.id), ...pending.map((p) => p.id)]).catch(() => null);
      if (states) {
        const kept = [];
        for (const item of toAnnounce) {
          const state = states.get(item.id)?.state;
          if (state === "upcoming") pending.push({ id: item.id, until: now + UPCOMING_FOR });
          else kept.push({ ...item, kind: state === "live" ? "live" : "upload" });
        }
        toAnnounce = kept;
        // Scheduled streams that started since.
        for (const waiting of [...pending]) {
          const state = states.get(waiting.id)?.state;
          if (state === "live") {
            const item = result.items.find((i) => i.id === waiting.id);
            events.push({ ...base, kind: "live", id: waiting.id, title: states.get(waiting.id).title || item?.title || "", link: `https://www.youtube.com/watch?v=${waiting.id}`, thumbnail: `https://i.ytimg.com/vi/${waiting.id}/hqdefault.jpg` });
            pending = pending.filter((p) => p.id !== waiting.id);
          }
          else if (state === "none") {
            pending = pending.filter((p) => p.id !== waiting.id);
          }
        }
      }
    }
    for (const item of toAnnounce) {
      events.push({ ...base, ...item });
    }
  }
  else if (feed.platform === "youtube" && pending.length) {
    const states = await provider.videoStates(pending.map((p) => p.id)).catch(() => null);
    for (const waiting of [...pending]) {
      const state = states?.get(waiting.id)?.state;
      if (state === "live") {
        events.push({ ...base, kind: "live", id: waiting.id, title: states.get(waiting.id).title, link: `https://www.youtube.com/watch?v=${waiting.id}`, thumbnail: `https://i.ytimg.com/vi/${waiting.id}/hqdefault.jpg` });
        pending = pending.filter((p) => p.id !== waiting.id);
      }
      else if (state === "none") {
        pending = pending.filter((p) => p.id !== waiting.id);
      }
    }
  }
  update.seen = [...result.items.map((i) => i.id), ...(feed.seen ?? [])].filter((id, i, all) => all.indexOf(id) === i).slice(0, MAX_SEEN);
  update.pending = pending;

  // Live streams (Twitch): announce when a new stream starts.
  if (result.live !== undefined) {
    if (result.live && result.live.id !== feed.live?.id) {
      if (feed.primed) {
        events.push({ ...base, kind: "live", ...result.live });
      }
      update.live = { id: result.live.id, at: now };
    }
    else if (!result.live) {
      update.live = null;
    }
  }
  update.primed = true;
  update.lastChecked = Date.now();
  return { events, update };
}

/** Posts one event to every server following the account. */
async function announce(feed, event) {
  const { peekSettings } = require("../guildSettings");
  const { buildMessage, contextFrom } = require("../placeholders");
  const rest = container.client.rest;
  for (const guildId of feed.guilds ?? []) {
    const settings = await peekSettings(guildId).catch(() => null);
    const rows = (settings?.notifications ?? []).filter((row) => {
      if (row.enabled === false || !row.channel || !wants(row, event.kind)) return false;
      try {
        return feedKey(row.platform, row.account) === feed._id;
      }
      catch {
        return false;
      }
    });
    if (!rows.length) continue;
    // Real server details for {{servername}} and friends, whichever cluster has the server.
    const guild = container.client.guilds.cache.get(guildId) ?? await rest.get(Routes.guild(guildId)).catch(() => ({ id: guildId }));
    for (const row of rows) {
      const ctx = contextFrom({
        guild,
        channel: { id: row.channel, name: guild.channels?.cache?.get(row.channel)?.name ?? "" },
        extra: { creator: event.creator, title: event.title ?? "", link: event.link ?? "", platform: event.platform, game: event.game ?? "", thumbnail: event.thumbnail ?? "" },
      });
      const message = buildMessage(settings, { content: row.content || DEFAULT_MESSAGES[event.kind], embed: row.embed }, ctx);
      if (!message) continue;
      const content = [row.role ? `<@&${row.role}>` : "", message.content ?? ""].filter(Boolean).join(" ").slice(0, 2000);
      const everyone = /@(everyone|here)\b/.test(row.content ?? "");
      await rest.post(Routes.channelMessages(row.channel), {
        body: {
          content: content || undefined,
          embeds: message.embeds,
          allowed_mentions: { parse: everyone ? ["everyone"] : [], roles: row.role ? [row.role] : [] },
        },
      }).catch((err) => console.warn(`[notifications] Couldn't post in ${row.channel} (${guildId}): ${err.message}`));
    }
  }
}

async function saveCheck(feed, outcome) {
  if (outcome.error) {
    await NotificationFeed.updateOne({ _id: feed._id }, { $set: { lastChecked: Date.now(), lastError: outcome.error }, $inc: { errorCount: 1 } });
    return;
  }
  const { events, update } = await diff(feed, outcome);
  await NotificationFeed.updateOne({ _id: feed._id }, { $set: update });
  for (const event of events) await announce(feed, event);
}

function describeError(err, provider) {
  if (err instanceof AccountError) return err.message;
  if (err.status === 401 || err.status === 403) return `${provider.label} refused the request. The bot's API key may be wrong.`;
  if (err.status === 429) return `${provider.label} is rate limiting Phoenix. It'll try again later.`;
  return `Couldn't reach ${provider.label} (${err.message}).`;
}

/** Checks every account that's due. */
async function tick() {
  if (running) return;
  running = true;
  try {
    const now = Date.now();
    const feeds = await NotificationFeed.find({ "guilds.0": { $exists: true } }).lean();
    // Accounts that keep failing are checked less often (up to once an hour).
    const due = feeds.filter((f) => {
      const provider = PROVIDERS[f.platform];
      if (!provider) return false;
      const backoff = Math.min(60 * 60_000, provider.interval * 2 ** Math.min(f.errorCount ?? 0, 5));
      return now - (f.lastChecked ?? 0) >= (f.errorCount ? backoff : provider.interval);
    });

    for (const [platform, provider] of Object.entries(PROVIDERS)) {
      const batch = due.filter((f) => f.platform === platform);
      if (!batch.length) continue;
      if (provider.available && !provider.available()) {
        for (const feed of batch) await saveCheck(feed, { error: provider.unavailable });
        continue;
      }
      // Twitch checks up to 100 accounts in one request.
      if (provider.checkMany) {
        for (let i = 0; i < batch.length; i += 100) {
          const chunk = batch.slice(i, i + 100);
          const results = await provider.checkMany(chunk).catch((err) => err);
          for (const feed of chunk) {
            const result = results instanceof Error ? { error: describeError(results, provider) } : results.get(feed.account) ?? { error: "No answer." };
            await saveCheck(feed, result).catch((err) => console.error("[notifications] save failed", err));
          }
        }
        continue;
      }
      for (const feed of batch) {
        const result = await provider.check(feed).catch((err) => ({ error: describeError(err, provider) }));
        await saveCheck(feed, result).catch((err) => console.error("[notifications] save failed", err));
      }
    }
  }
  catch (err) {
    console.error("[notifications] Check failed", err);
  }
  finally {
    running = false;
  }
}

/** Starts checking (cluster 0 only; see listeners/internal/clientReady.js). */
function start() {
  if (timer) return;
  setTimeout(tick, 20_000).unref?.();
  timer = setInterval(tick, TICK);
  timer.unref?.();
}

/** The status of each of a server's accounts, for the dashboard. */
async function statusFor(rows) {
  const keys = [];
  for (const row of rows ?? []) {
    try {
      keys.push(feedKey(row.platform, row.account));
    }
    catch {
      keys.push(null);
    }
  }
  const feeds = await NotificationFeed.find({ _id: { $in: keys.filter(Boolean) } }).select("name lastChecked lastError primed").lean();
  return keys.map((key) => {
    const feed = feeds.find((f) => f._id === key);
    return feed ? { key, name: feed.name ?? null, lastChecked: feed.lastChecked || null, error: feed.lastError ?? null, ready: Boolean(feed.primed) } : { key, name: null, lastChecked: null, error: null, ready: false };
  });
}

module.exports = { start, tick, syncGuild, statusFor, diff, announce, wants, DEFAULT_MESSAGES };
