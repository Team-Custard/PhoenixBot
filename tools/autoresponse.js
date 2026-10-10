// Autoresponses: Phoenix replies when a message matches a trigger. The matching is
// kept here, apart from Discord, so it can be tested on its own.
const { safeTest } = require("./regexWorker");

const MATCH_TYPES = ["contains", "word", "exact", "startsWith", "regex"];
const MAX_AUTORESPONSES = 100;
const COOLDOWN = 15_000;
const MAX_REGEX_LENGTH = 200;

function escape(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Explains why a regex isn't allowed, or returns null. Triggers run on every message,
 * so patterns that can take a very long time on some text ("catastrophic
 * backtracking", like (a+)+) are refused.
 */
function regexProblem(pattern, matchCase = false) {
  if (typeof pattern !== "string" || !pattern) return "is empty.";
  if (pattern.length > MAX_REGEX_LENGTH) return `can be at most ${MAX_REGEX_LENGTH} characters.`;
  try {
    new RegExp(pattern, matchCase ? "u" : "iu");
  }
  catch (err) {
    return `isn't a valid regex: ${err.message.replace(/^Invalid regular expression: /, "")}`;
  }
  if (/\\[1-9]|\\k</.test(pattern)) return "can't use backreferences.";
  if (/\(\?<?[=!]/.test(pattern)) return "can't use lookaheads or lookbehinds.";
  const { nestedRepeat, unbounded } = scanRepeats(pattern);
  if (nestedRepeat) return "has a repeat inside a repeat, which can make it very slow. Simplify it.";
  if (unbounded > 2) return "has too many open-ended repeats (*, + or {n,}), which can make it very slow. Simplify it.";
  return null;
}

/**
 * Looks through a regex for repeats: whether a repeated group contains another repeat
 * (at any depth, like ((a+))+), and how many open-ended repeats there are.
 * This is only a first check for the dashboard; regexes also run with a time limit.
 */
function scanRepeats(pattern) {
  const groups = [];
  let inClass = false;
  let unbounded = 0;
  let nestedRepeat = false;
  const quantifierAt = (i) => {
    const c = pattern[i];
    if (c === "*" || c === "+") return { unbounded: true, length: 1 };
    if (c === "?") return { unbounded: false, length: 1 };
    const brace = /^\{(\d+)(,(\d*))?\}/.exec(pattern.slice(i));
    if (brace) return { unbounded: brace[2] !== undefined && brace[3] === "", length: brace[0].length, repeats: brace[2] !== undefined || Number(brace[1]) > 1 };
    return null;
  };
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "\\") {
      i++;
      continue;
    }
    if (inClass) {
      if (c === "]") inClass = false;
      continue;
    }
    if (c === "[") {
      inClass = true;
      continue;
    }
    if (c === "(") {
      groups.push({ hasRepeat: false });
      continue;
    }
    const q = quantifierAt(i);
    if (c === ")") {
      const group = groups.pop() ?? { hasRepeat: false };
      const after = quantifierAt(i + 1);
      const repeats = after && (after.unbounded || after.repeats);
      if (repeats && group.hasRepeat) nestedRepeat = true;
      if (group.hasRepeat || repeats) for (const outer of groups) outer.hasRepeat = true;
      continue;
    }
    if (q && (q.unbounded || q.repeats)) {
      if (q.unbounded) unbounded++;
      for (const group of groups) group.hasRepeat = true;
      i += q.length - 1;
    }
  }
  return { nestedRepeat, unbounded };
}

/** Turns one autoresponse into a test function, or null if it can't be used. */
function compile(entry) {
  const trigger = String(entry.trigger ?? "");
  if (!trigger) return null;
  const flags = entry.matchCase ? "u" : "iu";
  switch (entry.match) {
    case "regex":
      if (regexProblem(trigger, entry.matchCase)) return null;
      // Admins' own regexes run in a separate thread with a time limit (tools/regexWorker.js).
      return { worker: true, pattern: trigger, flags };
    case "exact":
      return new RegExp(`^\\s*${escape(trigger)}\\s*$`, flags);
    case "startsWith":
      return new RegExp(`^\\s*${escape(trigger)}`, flags);
    case "word":
      return new RegExp(`(?<![\\p{L}\\p{N}_])${escape(trigger)}(?![\\p{L}\\p{N}_])`, flags);
    case "contains":
    default:
      return new RegExp(escape(trigger), flags);
  }
}

// Compiled triggers per server, rebuilt when the server's autoresponses change.
const compiled = new Map();

/**
 * The first enabled autoresponse that matches the message in this channel.
 * @param {string} guildId
 * @param {object[]} autoresponses settings.autoresponses
 * @param {{ content: string, channelId: string, parentId?: string|null }} message
 * @returns {Promise<{ entry: object, index: number }|null>}
 */
async function findMatch(guildId, autoresponses, message) {
  if (!autoresponses?.length || !message.content) return null;
  const signature = JSON.stringify(autoresponses.map((a) => [a.trigger, a.match, a.matchCase, a.enabled]));
  let cache = compiled.get(guildId);
  if (!cache || cache.signature !== signature) {
    cache = { signature, tests: autoresponses.map((a) => (a.enabled === false ? null : compile(a))) };
    compiled.set(guildId, cache);
    if (compiled.size > 10_000) compiled.delete(compiled.keys().next().value);
  }
  const text = message.content.slice(0, 2000);
  for (let index = 0; index < autoresponses.length; index++) {
    const test = cache.tests[index];
    if (!test) continue;
    const entry = autoresponses[index];
    const channels = entry.channels ?? [];
    if (channels.length && !channels.includes(message.channelId) && !channels.includes(message.parentId)) continue;
    if (test.worker) {
      if (await safeTest(test.pattern, test.flags, text)) return { entry, index };
      continue;
    }
    test.lastIndex = 0;
    if (test.test(text)) return { entry, index };
  }
  return null;
}

// 15 seconds per autoresponse per channel after it fires.
const cooldowns = new Map();
function onCooldown(key, now = Date.now()) {
  const last = cooldowns.get(key);
  if (last && now - last < COOLDOWN) return true;
  cooldowns.set(key, now);
  if (cooldowns.size > 50_000) {
    for (const [k, at] of cooldowns) if (now - at > COOLDOWN) cooldowns.delete(k);
  }
  return false;
}

module.exports = { MATCH_TYPES, MAX_AUTORESPONSES, COOLDOWN, regexProblem, scanRepeats, compile, findMatch, onCooldown };
