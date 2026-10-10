// Phoenix's own automod filters. The checks are plain functions over message text so
// they can be tested without Discord; the listeners in listeners/automod/ feed them
// messages and act on what they find.
const { PermissionFlagsBits } = require("discord.js");

const FILTERS = ["spam", "duplicates", "invites", "links", "mentions", "caps", "words", "emojis", "lines"];

const LABELS = {
  spam: "Sending messages too quickly",
  duplicates: "Repeating the same message",
  invites: "Posting a server invite",
  links: "Posting a link",
  mentions: "Mentioning too many people",
  caps: "Too many capital letters",
  words: "Using a blocked word",
  emojis: "Too many emojis",
  lines: "Too many lines",
};

const INVITE = /(?:discord(?:app)?\.com\/invite|discord\.gg|dsc\.gg|discord\.me|discord\.io|invite\.gg)\/([\w-]{2,32})/gi;
const URL_RE = /\bhttps?:\/\/([^\s/<>"'`]+)[^\s<]*/gi;
const CUSTOM_EMOJI = /<a?:\w{2,32}:\d{17,20}>/g;
const UNICODE_EMOJI = /\p{Extended_Pictographic}/gu;

/** The invite codes in a message. */
function findInvites(content) {
  return [...content.matchAll(INVITE)].map((m) => m[1]);
}

/** The host names linked in a message, lower case and without "www.". */
function findLinkHosts(content) {
  return [...content.matchAll(URL_RE)].map((m) => m[1].toLowerCase().replace(/^www\./, "").replace(/:\d+$/, ""));
}

/** True when the host is the domain or a subdomain of it. */
function hostAllowed(host, allowed) {
  return allowed.some((domain) => {
    const d = domain.toLowerCase().trim().replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/.*$/, "");
    return d && (host === d || host.endsWith(`.${d}`));
  });
}

function countEmojis(content) {
  return (content.match(CUSTOM_EMOJI)?.length ?? 0) + (content.replace(CUSTOM_EMOJI, "").match(UNICODE_EMOJI)?.length ?? 0);
}

/** Percentage of letters that are capitals (ignores mentions, emojis and links). */
function capsPercent(content) {
  const text = content.replace(/<[@#:&!a-z]*\d*>|<a?:\w+:\d+>/gi, "").replace(URL_RE, "");
  const letters = text.match(/\p{L}/gu) ?? [];
  const cased = letters.filter((c) => c.toLowerCase() !== c.toUpperCase());
  if (!cased.length) return { percent: 0, letters: 0 };
  const upper = cased.filter((c) => c === c.toUpperCase()).length;
  return { percent: Math.round((upper / cased.length) * 100), letters: cased.length };
}

// Leetspeak and look-alike letters people use to get around word filters.
const LOOKALIKES = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b", "@": "a", $: "s", "!": "i", "|": "i" };

function plainText(text) {
  // Strip accents: "bäd" → "bad".
  return text.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "");
}

/** Swaps look-alikes back ("h3ll0" → "hello"), but only in words that have letters, so numbers stay numbers. */
function leet(text) {
  return text.replace(/\S+/g, (token) => {
    if (!/\p{L}/u.test(token)) return token;
    return token
      .replace(/[0134578@$]/g, (c) => LOOKALIKES[c])
      .replace(/[!|](?=[\p{L}\p{N}])/gu, "i");
  });
}

/** Joins single letters split up with symbols ("b.a.d" → "bad"), without joining real words ("he'll"). */
function unspace(text) {
  return text.replace(/(?<![\p{L}\p{N}])\p{L}(?:[^\p{L}\p{N}\s]\p{L})+(?![\p{L}\p{N}])/gu, (m) => m.replace(/[^\p{L}]/gu, ""));
}

/**
 * Finds a blocked word. Entries match whole words; put * at the start or end
 * ("*bad", "bad*") to match inside words too.
 * @returns {string|null} The entry that matched.
 */
function findBlockedWord(content, words) {
  if (!words?.length) return null;
  const plain = plainText(content);
  // Check the text as written, with look-alikes swapped back ("h3ll0") and with
  // spelled-out letters joined ("b.a.d").
  const variants = [...new Set([plain, leet(plain), unspace(plain), unspace(leet(plain))])];
  for (const raw of words) {
    const entry = plainText(String(raw).trim());
    if (!entry) continue;
    const startWild = entry.startsWith("*");
    const endWild = entry.endsWith("*");
    const word = entry.replace(/^\*|\*$/g, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!word) continue;
    const re = new RegExp(`${startWild ? "" : "(?<![\\p{L}\\p{N}])"}${word}${endWild ? "" : "(?![\\p{L}\\p{N}])"}`, "u");
    if (variants.some((v) => re.test(v))) return String(raw).trim();
  }
  return null;
}

/**
 * Checks one message's content against the content filters (everything except spam
 * and duplicates, which need message history).
 * @param {object} filters settings.automod.filters
 * @param {object} message { content, mentionCount, guildId }
 * @param {{ ownInviteCodes?: Set<string> }} [extra]
 * @returns {{ filter: string, detail: string }|null}
 */
function checkContent(filters, message, extra = {}) {
  const content = message.content ?? "";
  const f = filters ?? {};

  if (f.words?.enabled) {
    const word = findBlockedWord(content, f.words.words);
    if (word) return { filter: "words", detail: `Matched “${word}”` };
  }
  if (f.invites?.enabled) {
    const codes = findInvites(content);
    const foreign = codes.filter((code) => !(f.invites.allowOwnServer !== false && extra.ownInviteCodes?.has(code)));
    if (foreign.length) return { filter: "invites", detail: `discord.gg/${foreign[0]}` };
  }
  if (f.links?.enabled) {
    const hosts = findLinkHosts(content).filter((h) => !/^(discord\.gg|discord(app)?\.com|dsc\.gg)$/.test(h) || !f.invites?.enabled);
    const blocked = hosts.find((h) => !hostAllowed(h, f.links.allowedDomains ?? []));
    if (blocked) return { filter: "links", detail: blocked };
  }
  if (f.mentions?.enabled && message.mentionCount > (f.mentions.max ?? 6)) {
    return { filter: "mentions", detail: `${message.mentionCount} mentions` };
  }
  if (f.caps?.enabled) {
    const { percent, letters } = capsPercent(content);
    if (letters >= (f.caps.minLength ?? 12) && percent >= (f.caps.percent ?? 70)) return { filter: "caps", detail: `${percent}% capitals` };
  }
  if (f.emojis?.enabled) {
    const count = countEmojis(content);
    if (count > (f.emojis.max ?? 10)) return { filter: "emojis", detail: `${count} emojis` };
  }
  if (f.lines?.enabled) {
    const lines = content.split("\n").length;
    if (lines > (f.lines.max ?? 15)) return { filter: "lines", detail: `${lines} lines` };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Message history for the spam and duplicate filters. Kept in memory per cluster,
// which is fine because a server always lives on one cluster.
// ---------------------------------------------------------------------------

const HISTORY_MS = 30_000;
const history = new Map();

/**
 * Records a message and checks the history-based filters.
 * @param {object} filters
 * @param {{ id: string, guildId: string, channelId: string, authorId: string, content: string, createdTimestamp: number }} message
 * @returns {{ filter: string, detail: string, messages: { id: string, channelId: string }[] }|null}
 */
function checkHistory(filters, message) {
  const key = `${message.guildId}:${message.authorId}`;
  const now = message.createdTimestamp ?? Date.now();
  const entries = (history.get(key) ?? []).filter((m) => now - m.at < HISTORY_MS);
  const text = (message.content ?? "").trim().toLowerCase();
  entries.push({ id: message.id, channelId: message.channelId, at: now, text });
  history.set(key, entries);

  if (filters?.spam?.enabled) {
    const windowMs = Math.max(1, filters.spam.seconds ?? 5) * 1000;
    const recent = entries.filter((m) => now - m.at <= windowMs);
    if (recent.length > (filters.spam.maxMessages ?? 6)) {
      return { filter: "spam", detail: `${recent.length} messages in ${windowMs / 1000}s`, messages: recent };
    }
  }
  if (filters?.duplicates?.enabled && text) {
    const same = entries.filter((m) => m.text === text);
    if (same.length >= (filters.duplicates.count ?? 4)) {
      return { filter: "duplicates", detail: `Sent ${same.length} times`, messages: same };
    }
  }
  return null;
}

/** Forget a member's history after they've been dealt with. */
function clearHistory(guildId, userId) {
  history.delete(`${guildId}:${userId}`);
}

// Clean up old history now and then so memory doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [key, entries] of history) {
    if (!entries.some((m) => now - m.at < HISTORY_MS)) history.delete(key);
  }
}, 60_000).unref();

// One punishment per member per few seconds, however many messages they send.
const recentPunishments = new Map();
function shouldPunish(key, windowMs = 10_000) {
  const now = Date.now();
  const last = recentPunishments.get(key);
  if (last && now - last < windowMs) return false;
  recentPunishments.set(key, now);
  if (recentPunishments.size > 5_000) {
    for (const [k, at] of recentPunishments) if (now - at > windowMs) recentPunishments.delete(k);
  }
  return true;
}

const MODERATOR_PERMISSIONS = [
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.ModerateMembers,
];

/**
 * Whether automod should leave this member or channel alone. People with Manage
 * Server are always left alone, like Discord's own AutoMod does.
 */
function isExempt(automod, member, channel) {
  if (!member) return true;
  if (member.id === member.guild.ownerId) return true;
  if (member.permissions.any([PermissionFlagsBits.ManageGuild, PermissionFlagsBits.Administrator])) return true;
  if (automod.ignoreModerators !== false && member.permissions.any(MODERATOR_PERMISSIONS)) return true;
  const roles = automod.exemptRoles ?? [];
  if (roles.length && member.roles.cache.some((r) => roles.includes(r.id))) return true;
  const channels = automod.exemptChannels ?? [];
  if (channel && (channels.includes(channel.id) || channels.includes(channel.parentId) || (channel.parent?.parentId && channels.includes(channel.parent.parentId)))) {
    return true;
  }
  return false;
}

/** True when any message filter is turned on. */
function anyFilterOn(automod) {
  return FILTERS.some((name) => automod?.filters?.[name]?.enabled);
}

module.exports = {
  FILTERS,
  LABELS,
  findInvites,
  findLinkHosts,
  hostAllowed,
  countEmojis,
  capsPercent,
  findBlockedWord,
  checkContent,
  checkHistory,
  clearHistory,
  shouldPunish,
  isExempt,
  anyFilterOn,
};
