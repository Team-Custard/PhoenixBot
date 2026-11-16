// The counting channel: members count up one number at a time. Phoenix deletes
// anything that isn't the next number, can start the count over after a mistake, and
// can give a role for a while to people who make too many mistakes.
// Settings are on the dashboard's Counting page; the count itself is in CountingState.
const { Routes } = require("discord.js");
const CountingState = require("./models/CountingState");
const { scheduleMemberTask } = require("./tasks");

const MISTAKE_WINDOW = 24 * 60 * 60 * 1000;
const NOTICE_LIFETIME = 6_000;

/** The number a message starts with ("12", "12 nice", "12!"), or null. */
function parseCount(content) {
  const match = /^\s*(\d{1,15})(?![\d.,])/.exec(String(content ?? ""));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isSafeInteger(value) ? value : null;
}

/** The server's count, started over when the counting channel changed. */
async function stateFor(guildId, channelId) {
  const state = await CountingState.findById(guildId).lean();
  if (state && state.channelId === channelId) return state;
  return CountingState.findOneAndUpdate(
    { _id: guildId },
    { $set: { channelId, count: 0, lastUserId: null, mistakes: [] } },
    { upsert: true, new: true, lean: true },
  );
}

// Messages in one server's counting channel are checked one at a time (a server is
// always on one cluster), so two people posting at once can't both read the same count.
const queues = new Map();
function oneAtATime(guildId, fn) {
  const previous = queues.get(guildId) ?? Promise.resolve();
  const next = previous.then(fn, fn);
  const tail = next.catch(() => undefined);
  queues.set(guildId, tail);
  tail.then(() => {
    if (queues.get(guildId) === tail) queues.delete(guildId);
  });
  return next;
}

/**
 * Checks one message in the counting channel.
 * @returns {Promise<{ result: "counted"|"ignored"|"chatter"|"wrong"|"twice", expected?: number, reset?: boolean, punished?: boolean }>}
 */
function handleMessage(message, settings) {
  const cfg = settings?.counting;
  if (!cfg?.channel || message.channelId !== cfg.channel) return Promise.resolve({ result: "ignored" });
  return oneAtATime(message.guildId, () => check(message, cfg));
}

async function check(message, cfg, attempt = 0) {
  const guildId = message.guildId;
  const state = await stateFor(guildId, cfg.channel);
  const number = parseCount(message.content);
  const expected = (state.count ?? 0) + 1;

  if (number === null) {
    // Only numbers go in the counting channel.
    await message.delete().catch(() => undefined);
    return { result: "chatter", expected };
  }

  const twice = !cfg.allowTwiceInRow && state.lastUserId === message.author.id;
  if (number === expected && !twice) {
    // Only counts if nobody else counted in the meantime.
    const updated = await CountingState.findOneAndUpdate(
      { _id: guildId, channelId: cfg.channel, count: state.count ?? 0 },
      {
        $set: {
          count: expected,
          lastUserId: message.author.id,
          ...(expected > (state.highScore ?? 0) ? { highScoreAt: Math.floor(Date.now() / 1000) } : {}),
        },
        $max: { highScore: expected },
      },
      { new: true, lean: true },
    );
    if (updated) {
      if (cfg.react !== false) await message.react(cfg.reactEmoji || "✅").catch(() => undefined);
      return { result: "counted", expected };
    }
    // Someone else changed the count meanwhile (the dashboard, another cluster):
    // check again against the new count.
    if (attempt < 3) return check(message, cfg, attempt + 1);
  }

  return mistake(message, cfg, state, { expected, twice });
}

async function mistake(message, cfg, state, { expected, twice }) {
  const guildId = message.guildId;
  const userId = message.author.id;
  const now = Date.now();
  await message.delete().catch(() => undefined);

  const recent = (state.mistakes ?? []).filter((m) => now - m.at < MISTAKE_WINDOW);
  const mine = recent.filter((m) => m.userId === userId).length + 1;
  const limit = cfg.mistakeLimit || 3;
  const punish = Boolean(cfg.mistakeRole) && mine >= limit;
  // Someone who just got the role starts from zero again.
  const mistakes = punish ? recent.filter((m) => m.userId !== userId) : [...recent, { userId, at: now }].slice(-200);
  const reset = Boolean(cfg.resetOnMistake) && (state.count ?? 0) > 0;
  await CountingState.updateOne({ _id: guildId }, { $set: { mistakes } });
  // Only starts over from the count this mistake was about.
  if (reset) await CountingState.updateOne({ _id: guildId, count: state.count }, { $set: { count: 0, lastUserId: null } });

  const channel = message.channel;
  const who = `<@${userId}>`;
  let text;
  if (reset) text = `${who} ruined it at **${state.count}**! The count starts over: the next number is **1**.`;
  else if (twice) text = `${who}, you can't count twice in a row. Let someone else go. The next number is **${expected}**.`;
  else text = `${who}, that isn't the next number. The next number is **${expected}**.`;

  if (punish) {
    const minutes = Math.round((cfg.mistakeRoleDuration || 3_600_000) / 60_000);
    const given = await giveMistakeRole(message, cfg);
    if (given) text += `\n${who} made ${mine} mistakes in a day, so they get <@&${cfg.mistakeRole}> for ${minutes >= 60 ? `${Math.round(minutes / 60)} hour${minutes >= 120 ? "s" : ""}` : `${minutes} minute${minutes === 1 ? "" : "s"}`}.`;
  }
  else if (cfg.mistakeRole) {
    text += `\n-# ${mine} of ${limit} mistakes today.`;
  }

  const notice = await channel.send({ content: text, allowedMentions: { users: [userId] } }).catch(() => null);
  // A reset stays visible; the small notices clean themselves up.
  if (notice && !reset) setTimeout(() => notice.delete().catch(() => undefined), NOTICE_LIFETIME).unref?.();
  return { result: twice ? "twice" : "wrong", expected: reset ? 1 : expected, reset, punished: punish };
}

async function giveMistakeRole(message, cfg) {
  const member = message.member;
  if (!member) return false;
  const ok = await member.roles.add(cfg.mistakeRole, "Counting: too many wrong numbers").then(() => true, () => false);
  if (!ok) return false;
  await scheduleMemberTask(
    "countingRole",
    { guildid: message.guildId, memberid: member.id, roleid: cfg.mistakeRole },
    cfg.mistakeRoleDuration || 3_600_000,
  );
  return true;
}

/** Takes the counting role off again (scheduled-tasks/countingRole.js). Works from any cluster. */
async function removeMistakeRole(client, { guildid, memberid, roleid }) {
  await client.rest.delete(Routes.guildMemberRole(guildid, memberid, roleid), { reason: "Counting role ran out" }).catch(() => undefined);
}

/** Sets the count (dashboard). The next number is count + 1. */
async function setCount(guildId, channelId, count) {
  return CountingState.findOneAndUpdate(
    { _id: guildId },
    { $set: { channelId, count, lastUserId: null }, $max: { highScore: count } },
    { upsert: true, new: true, lean: true },
  );
}

module.exports = { parseCount, handleMessage, setCount, stateFor, removeMistakeRole, MISTAKE_WINDOW };
