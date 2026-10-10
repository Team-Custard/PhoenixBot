// A send queue for everything Phoenix posts on its own (logs, welcome messages,
// level-ups, starboard, automod notes, autoresponses, timed and sticky messages).
//
// discord.js already waits out rate limits per route, but with the bot in many
// servers a burst (a raid, a mass ban, a busy chat) can still push it towards
// Discord's global limit of 50 requests a second, and every 429 counts towards
// Discord's invalid-request ban. This queue:
//   - spreads requests out with a token bucket shared by all modules in a cluster
//     (the global budget is split between clusters),
//   - takes turns between channels, so one busy server can't starve the others,
//   - keeps each channel's messages in order, one request at a time,
//   - drops the oldest jobs for a channel when its backlog gets silly.
// Command replies don't go through here: people are waiting for those.
const { container } = require("@sapphire/framework");

// Discord allows 50; leave room for command replies.
const GLOBAL_PER_SECOND = 40;
const MAX_CONCURRENT = 10;
const MAX_BACKLOG_PER_KEY = 50;

class SendQueue {
  constructor({ perSecond = GLOBAL_PER_SECOND, concurrency = MAX_CONCURRENT, maxBacklog = MAX_BACKLOG_PER_KEY } = {}) {
    this.perSecond = perSecond;
    this.concurrency = concurrency;
    this.maxBacklog = maxBacklog;
    this.tokens = perSecond;
    this.lastRefill = Date.now();
    // key -> jobs waiting
    this.lanes = new Map();
    // keys with a job running
    this.busy = new Set();
    // round-robin order of keys with waiting jobs
    this.order = [];
    this.active = 0;
    this.timer = null;
    this.stats = { sent: 0, dropped: 0, failed: 0 };
  }

  /** Requests per second this cluster may use (the global budget split between clusters). */
  rate() {
    const clusters = container.client?.cluster?.count ?? 1;
    return Math.max(5, Math.floor(this.perSecond / Math.max(1, clusters)));
  }

  refill() {
    const now = Date.now();
    const rate = this.rate();
    this.tokens = Math.min(rate, this.tokens + ((now - this.lastRefill) / 1000) * rate);
    this.lastRefill = now;
  }

  /**
   * Queues a job. Jobs with the same key run one at a time, in order.
   * @template T
   * @param {string} key Usually a channel id.
   * @param {() => Promise<T>} fn
   * @param {{ maxBacklog?: number }} [options] How many jobs may wait for this key.
   * @returns {Promise<T|undefined>} undefined if the job was dropped.
   */
  run(key, fn, { maxBacklog = this.maxBacklog } = {}) {
    return new Promise((resolve, reject) => {
      let lane = this.lanes.get(key);
      if (!lane) {
        lane = [];
        this.lanes.set(key, lane);
      }
      if (lane.length >= maxBacklog) {
        // Too far behind: drop the oldest job rather than build up a huge backlog.
        lane.shift().resolve(undefined);
        this.stats.dropped++;
      }
      lane.push({ fn, resolve, reject });
      if (!this.order.includes(key)) this.order.push(key);
      this.pump();
    });
  }

  pump() {
    this.refill();
    while (this.active < this.concurrency && this.tokens >= 1) {
      const index = this.order.findIndex((key) => !this.busy.has(key));
      if (index === -1) break;
      const [key] = this.order.splice(index, 1);
      const lane = this.lanes.get(key);
      const job = lane.shift();
      // back of the line: take turns
      if (lane.length) this.order.push(key);
      else this.lanes.delete(key);
      this.tokens -= 1;
      this.active++;
      this.busy.add(key);
      Promise.resolve()
        .then(job.fn)
        .then((value) => {
          this.stats.sent++;
          job.resolve(value);
        }, (err) => {
          this.stats.failed++;
          job.reject(err);
        })
        .finally(() => {
          this.active--;
          this.busy.delete(key);
          this.pump();
        });
    }
    // Wait for tokens if there's still work.
    if (this.order.length && !this.timer && this.tokens < 1) {
      const wait = Math.ceil(((1 - this.tokens) / this.rate()) * 1000);
      this.timer = setTimeout(() => {
        this.timer = null;
        this.pump();
      }, wait);
      this.timer.unref?.();
    }
  }

  /** How many jobs are waiting. */
  get size() {
    let total = 0;
    for (const lane of this.lanes.values()) total += lane.length;
    return total;
  }
}

const queue = new SendQueue();

/**
 * Sends a message to a channel through the queue. Errors are logged, not thrown.
 * @param {import("discord.js").TextBasedChannel} channel
 * @param {import("discord.js").MessageCreateOptions|string} payload
 */
function send(channel, payload) {
  if (!channel?.send) return Promise.resolve(undefined);
  return queue.run(channel.id, () => channel.send(payload)).catch((err) => {
    // 50001 Missing Access, 50013 Missing Permissions, 10003 Unknown Channel: the
    // server's setup is wrong, nothing to retry.
    if (![50001, 50013, 10003].includes(err?.code)) console.error(`[queue] Send to ${channel.id} failed`, err?.message ?? err);
    return undefined;
  });
}

module.exports = { SendQueue, queue, send };
