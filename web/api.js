// JSON API used by the React dashboard (frontend/src/pages). Everything under
// /api/dashboard needs a login; everything under /api/dashboard/guilds/:guildId also
// needs Manage Server in that server and the bot to be in it.
const fs = require("fs");
const path = require("path");
const express = require("express");
const { container } = require("@sapphire/framework");
const { EmbedBuilder, Colors } = require("discord.js");
const ServerSettings = require("../tools/SettingsSchema");
const Case = require("../tools/models/Case");
const LevelMember = require("../tools/models/LevelMember");
const { buildModlogEmbed } = require("../tools/moderation");
const xpForLevel = require("../tools/xpToLevel");
const { EmbedError, cleanEmbedData, toDiscordEmbed, isEmptyEmbed, embedUsers, describeUsers } = require("../tools/embeds");
const { sections, fieldsByKey, HONEYPOT_WARNING } = require("./spec");
const { placeholderList, contextFrom, render, renderEmbed, buildMessage } = require("../tools/placeholders");
const discord = require("./discord");
const { refreshGuilds, logout } = require("./session");
const { recordAudit, listAudit } = require("./audit");

const router = express.Router();
const RANKCARD_DIR = path.join(__dirname, "../static/rankcards");
const SNOWFLAKE = /^\d{17,20}$/;
const CUSTOM_EMOJI = /^<(a?):(\w{2,32}):(\d{17,20})>$/;
// Also keycaps (1️⃣ #️⃣) and the England, Scotland and Wales flags (tag characters).
const UNICODE_EMOJI = /^(?:[#*0-9]\uFE0F?\u20E3|(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Regional_Indicator}{2})(\uFE0F|\u200D|\p{Extended_Pictographic}|\p{Emoji_Modifier}|\u20E3|[\u{E0020}-\u{E007F}])*)$/u;

const { LIMITS: PLUS_LIMITS, limitsFor, limitMessage } = require("../tools/limits");
const LIMITS = { ...PLUS_LIMITS, roleMenuRoles: 16 };

class ApiError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Settings and embeds are small; images are uploaded as raw PNG bodies instead.
router.use(express.json({ limit: "1mb" }));

// ---------------------------------------------------------------------------
// Auth, CSRF and rate limits
// ---------------------------------------------------------------------------

router.use((req, res, next) => {
  if (!req.session) return res.status(401).json({ error: "not_logged_in", message: "Please log in again." });
  // Browsers won't send custom headers cross-site without permission, which blocks
  // other sites from submitting changes with your login (CSRF).
  if (req.method !== "GET" && req.get("X-Phoenix-Dashboard") !== "1") {
    return res.status(403).json({ error: "bad_request", message: "Missing dashboard header." });
  }
  next();
});

const writeBuckets = new Map();
function rateLimit(req, res, next) {
  if (req.method === "GET") return next();
  const key = req.session.user.id;
  const now = Date.now();
  const bucket = writeBuckets.get(key) ?? { count: 0, reset: now + 60_000 };
  if (bucket.reset < now) Object.assign(bucket, { count: 0, reset: now + 60_000 });
  bucket.count++;
  writeBuckets.set(key, bucket);
  if (writeBuckets.size > 10_000) writeBuckets.clear();
  if (bucket.count > 60) return res.status(429).json({ error: "rate_limited", message: "You're saving very quickly. Wait a moment and try again." });
  next();
}
router.use(rateLimit);

router.post("/logout", wrap(async (req, res) => {
  await logout(req, res);
  res.json({ ok: true });
}));

router.get("/me", wrap(async (req, res) => {
  const guilds = (await refreshGuilds(req.session)).filter(discord.canManage);
  const present = await discord.botGuildIds(guilds.map((g) => g.id));
  res.json({
    user: req.session.user,
    inviteUrl: discord.inviteUrl(),
    guilds: guilds
      .map((g) => ({ id: g.id, name: g.name, icon: g.icon, botPresent: present.has(g.id), inviteUrl: discord.inviteUrl(g.id) }))
      .sort((a, b) => Number(b.botPresent) - Number(a.botPresent) || a.name.localeCompare(b.name)),
  });
}));

// Your own UserDB settings (the /userdb page on the website).
router.use(require("./userdb"));

// Every route below works on one server the user can manage.
router.use("/guilds/:guildId", wrap(async (req, res, next) => {
  const { guildId } = req.params;
  if (!SNOWFLAKE.test(guildId)) throw new ApiError(404, "That server doesn't exist.");
  let guilds = await refreshGuilds(req.session);
  let entry = guilds.find((g) => g.id === guildId);
  // Maybe they were just given permissions: check once more with fresh data.
  if (!entry || !discord.canManage(entry)) {
    guilds = await refreshGuilds(req.session, { force: true });
    entry = guilds.find((g) => g.id === guildId);
  }
  if (!entry || !discord.canManage(entry)) {
    throw new ApiError(403, "You need the Manage Server permission in that server to change its settings.");
  }
  const guild = await discord.getGuild(guildId).catch(() => null);
  if (!guild) {
    throw new ApiError(404, "Phoenix isn't in that server yet.", { error: "bot_not_in_guild", inviteUrl: discord.inviteUrl(guildId) });
  }
  req.guild = guild;
  next();
}));

// ---------------------------------------------------------------------------
// Server data
// ---------------------------------------------------------------------------

async function getSettingsDoc(guildId) {
  let doc = await ServerSettings.findById(guildId);
  if (!doc) {
    await ServerSettings.updateOne({ _id: guildId }, { $setOnInsert: { _id: guildId } }, { upsert: true, setDefaultsOnInsert: true });
    doc = await ServerSettings.findById(guildId);
  }
  return doc;
}

/** Channels, roles and what the bot is allowed to do in a server. */
async function getGuildContext(guildId) {
  const [channels, roles, botMember] = await Promise.all([
    discord.getChannels(guildId),
    discord.getRoles(guildId),
    discord.getBotMember(guildId).catch(() => null),
  ]);
  const roleMap = new Map(roles.map((r) => [r.id, r]));
  const botRoles = (botMember?.roles ?? []).map((id) => roleMap.get(id)).filter(Boolean);
  const everyone = roleMap.get(guildId);
  const botTopPosition = Math.max(0, ...botRoles.map((r) => r.position));
  const botPermissions = [everyone, ...botRoles].reduce((all, r) => all | BigInt(r?.permissions ?? 0), 0n);
  return {
    channels: new Map(channels.map((c) => [c.id, c])),
    roles: roleMap,
    botTopPosition,
    botPermissions,
    botMember,
  };
}

/** Where to buy Phoenix Plus for a server: the app's store page in Discord. */
async function plusStoreUrl() {
  const config = require("../config.json");
  if (!config.premiumId) return "/plus";
  const appId = await discord.getApplicationId().catch(() => null);
  return appId ? `https://discord.com/application-directory/${appId}/store/${config.premiumId}` : "/plus";
}

/** The bot's name and avatar in a server, for the Bot profile page. */
function profileOf(guildId, member, savedBio = null) {
  const user = member?.user ?? {};
  const userAvatar = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
    : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(user.id ?? 0) >> 22n) % 6n)}.png`;
  return {
    username: user.global_name || user.username || "Phoenix",
    nick: member?.nick ?? null,
    userAvatar,
    avatar: member?.avatar
      ? `https://cdn.discordapp.com/guilds/${guildId}/users/${user.id}/avatars/${member.avatar}.png?size=256`
      : null,
    banner: member?.banner
      ? `https://cdn.discordapp.com/guilds/${guildId}/users/${user.id}/banners/${member.banner}.png?size=600`
      : null,
    bio: member?.bio ?? savedBio ?? null,
  };
}

let commandListCache = null;
/** Names of commands that can be disabled or granted (everything except developer commands). */
function commandList() {
  const store = container.stores?.get("commands");
  if (store?.size) {
    return [...store.values()]
      .filter((c) => c.category !== "dev" && !c.isSlashGroup)
      .map((c) => ({ name: c.name, description: c.description, category: c.category ?? "general" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  // Dashboard-only mode has no bot client, so read the names from the command files.
  if (commandListCache) return commandListCache;
  const root = path.join(__dirname, "../commands");
  const found = [];
  for (const category of fs.readdirSync(root, { withFileTypes: true })) {
    if (!category.isDirectory() || ["dev", "groups"].includes(category.name)) continue;
    for (const file of fs.readdirSync(path.join(root, category.name))) {
      if (!file.endsWith(".js")) continue;
      const source = fs.readFileSync(path.join(root, category.name, file), "utf8");
      const name = source.match(/name:\s*"([\w-]+)"/)?.[1];
      const description = source.match(/description:\s*"([^"]+)"/)?.[1] ?? "";
      if (name) found.push({ name, description, category: category.name });
    }
  }
  commandListCache = found.sort((a, b) => a.name.localeCompare(b.name));
  return commandListCache;
}

function plain(value) {
  if (value && typeof value.toObject === "function") return value.toObject({ depopulate: true });
  if (Array.isArray(value)) return value.map(plain);
  return value;
}

function stripIds(value) {
  if (Array.isArray(value)) return value.map(stripIds);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) if (k !== "_id") out[k] = stripIds(v);
    return out;
  }
  return value;
}

function settingsValues(doc) {
  const values = {};
  for (const [key] of fieldsByKey) {
    const raw = stripIds(plain(doc.get(key)));
    values[key] = raw === undefined ? null : raw;
  }
  return values;
}

function roleMenusOf(doc) {
  return stripIds(plain(doc.rolesMenu ?? []));
}

function embedsOf(doc) {
  return (doc.embeds ?? []).map((e) => ({ name: e.name, data: stripIds(plain(e.data)) }));
}

function tagsOf(doc) {
  return (doc.tags ?? []).map((t) => ({ name: t.name, description: t.description ?? "", embed: t.embed ?? null, creator: t.creator }));
}

/** A tag's text and attached saved embed. A tag needs at least one of them. */
function tagBody(doc, body) {
  const description = validateField({ key: "description", type: "textarea", max: 2048 }, body?.description, {}, "Tag text");
  const embed = validateField({ key: "embed", type: "embed" }, body?.embed, { embedNames: (doc.embeds ?? []).map((e) => e.name) }, "Embed");
  if (!description?.trim() && !embed) throw new ApiError(400, "Give the tag some text or an embed.");
  return { description: description ?? "", embed };
}

/**
 * The server's custom emojis Phoenix can use, for the emoji picker. Emojis locked to
 * roles Phoenix doesn't have, and ones the server lost (boost level dropped), are left out.
 */
function usableEmojis(guild, botMember) {
  const botRoles = new Set(botMember?.roles ?? []);
  const all = guild.emojis ?? [];
  const canUse = (e) => e.available !== false && (!e.roles?.length || e.roles.some((id) => botRoles.has(id)));
  return {
    emojis: all.filter((e) => e.id && canUse(e)).map((e) => ({ id: e.id, name: e.name, animated: Boolean(e.animated) })),
    // So the dashboard can say why an emoji that's already set won't work.
    hiddenEmojiIds: all.filter((e) => e.id && !canUse(e)).map((e) => e.id),
  };
}

router.get("/guilds/:guildId", wrap(async (req, res) => {
  const guildId = req.params.guildId;
  const [doc, context, premium, caseCount, levelCount, automodRules] = await Promise.all([
    getSettingsDoc(guildId),
    getGuildContext(guildId),
    discord.hasPremium(guildId),
    Case.countDocuments({ guildId }),
    LevelMember.countDocuments({ guildId }),
    discord.getAutomodRules(guildId),
  ]);
  const hasRankCard = fs.existsSync(path.join(RANKCARD_DIR, `${guildId}-rankcard.png`));

  res.json({
    guild: {
      id: req.guild.id,
      name: req.guild.name,
      icon: req.guild.icon,
      banner: req.guild.banner ?? null,
      memberCount: req.guild.approximate_member_count ?? null,
      ownerId: req.guild.owner_id,
    },
    placeholders: placeholderList(),
    ...usableEmojis(req.guild, context.botMember),
    premium,
    channels: [...context.channels.values()]
      .map((c) => ({ id: c.id, name: c.name, type: c.type, parentId: c.parent_id ?? null, position: c.position }))
      .sort((a, b) => a.position - b.position),
    roles: [...context.roles.values()]
      .filter((r) => r.id !== guildId)
      .map((r) => ({ id: r.id, name: r.name, color: r.color, position: r.position, managed: r.managed, assignable: !r.managed && r.position < context.botTopPosition }))
      .sort((a, b) => b.position - a.position),
    bot: {
      topRolePosition: context.botTopPosition,
      permissions: context.botPermissions.toString(),
      profile: profileOf(guildId, context.botMember, doc.botProfile?.bio),
    },
    commands: commandList(),
    // null when Phoenix can't see the server's AutoMod rules (no Manage Server).
    automodRules,
    sections,
    settings: settingsValues(doc),
    roleMenus: roleMenusOf(doc),
    tags: tagsOf(doc),
    embeds: embedsOf(doc),
    stats: { cases: caseCount, levelMembers: levelCount, hasRankCard },
    limits: { ...limitsFor(premium), roleMenuRoles: LIMITS.roleMenuRoles },
    // For the Plus page: every limit with and without Plus, and how much is used.
    plus: {
      active: premium,
      storeUrl: await plusStoreUrl(),
      limits: Object.entries(PLUS_LIMITS).map(([key, l]) => ({
        key,
        label: l.label,
        free: l.free,
        premium: l.premium,
        used: { roleMenus: doc.rolesMenu?.length, tags: doc.tags?.length, embeds: doc.embeds?.length, autoresponses: doc.autoresponses?.length, timedMessages: doc.timedMessages?.length, stickyMessages: doc.stickyMessages?.length }[key] ?? 0,
      })),
    },
  });
}));

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateField(field, value, ctx, label = field.label) {
  const empty = value === null || value === undefined || value === "";
  const fail = (message) => {
    throw new ApiError(400, `${label}: ${message}`, { field: field.key });
  };

  switch (field.type) {
    case "text":
    case "textarea": {
      if (empty) {
        if (field.min) fail("can't be empty.");
        return null;
      }
      if (typeof value !== "string") fail("must be text.");
      const text = field.type === "text" ? value.trim() : value;
      if (field.max && text.length > field.max) fail(`can be at most ${field.max} characters.`);
      if (field.min && text.length < field.min) fail(`needs at least ${field.min} characters.`);
      if (field.noSpaces && /\s/.test(text)) fail("can't contain spaces.");
      return text;
    }
    case "toggle":
      if (empty) return field.default ?? false;
      if (typeof value !== "boolean") fail("must be on or off.");
      return value;
    case "number": {
      if (empty) {
        if (field.required) fail("is required.");
        return null;
      }
      let n = Number(value);
      if (field.decimal) {
        if (!Number.isFinite(n)) fail("must be a number.");
        n = Math.round(n * 100) / 100;
      }
      else if (!Number.isInteger(n)) {
        fail("must be a whole number.");
      }
      if (field.min !== undefined && n < field.min) fail(`must be at least ${field.min}.`);
      if (field.max !== undefined && n > field.max) fail(`must be at most ${field.max}.`);
      return field.storeAs === "string" ? String(n) : n;
    }
    case "duration": {
      if (empty || Number(value) === 0) {
        if (field.required) fail("is required.");
        return 0;
      }
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) fail("must be a length of time.");
      if (field.max !== undefined && n > field.max) fail("is too long.");
      if (field.minNonZero && n > 0 && n < field.minNonZero) fail(`must be at least ${Math.round(field.minNonZero / 1000)} seconds, or 0 to turn it off.`);
      return Math.round(n);
    }
    case "channel": {
      if (empty) {
        if (field.required) fail("is required.");
        return null;
      }
      const channel = ctx.channels.get(String(value));
      if (!channel) fail("that channel doesn't exist anymore.");
      if (field.channelTypes && !field.channelTypes.includes(channel.type)) fail(`#${channel.name} can't be used here.`);
      return channel.id;
    }
    case "channels": {
      if (empty) return [];
      if (!Array.isArray(value) || value.length > 100) fail("must be a list of channels.");
      return [...new Set(value.map((id) => validateField({ ...field, type: "channel", required: true }, id, ctx, label)))];
    }
    case "role": {
      if (empty) {
        if (field.required) fail("is required.");
        return null;
      }
      const role = ctx.roles.get(String(value));
      if (!role || role.id === ctx.guildId) fail("that role doesn't exist anymore.");
      if (field.assignable && (role.managed || role.position >= ctx.botTopPosition)) {
        fail(`Phoenix can't give out @${role.name}. Move Phoenix's role above it in Server Settings → Roles.`);
      }
      return role.id;
    }
    case "roles": {
      if (empty) return [];
      if (!Array.isArray(value) || value.length > 100) fail("must be a list of roles.");
      return [...new Set(value.map((id) => validateField({ ...field, type: "role", required: true }, id, ctx, label)))];
    }
    case "emoji": {
      if (empty) return null;
      const text = String(value).trim();
      if (!CUSTOM_EMOJI.test(text) && !UNICODE_EMOJI.test(text)) fail("must be one emoji.");
      return text;
    }
    case "url": {
      if (empty) return null;
      let url;
      try {
        url = new URL(String(value).trim());
      }
      catch {
        fail("must be a link.");
      }
      if (url.protocol !== "https:") fail("must start with https://.");
      if (url.href.length > 512) fail("is too long.");
      return url.href;
    }
    case "commands": {
      if (empty) return [];
      if (!Array.isArray(value)) fail("must be a list of commands.");
      const known = new Set(ctx.commands.map((c) => c.name));
      const unknown = value.find((name) => !known.has(name));
      if (unknown) fail(`"${unknown}" isn't a command.`);
      return [...new Set(value)];
    }
    case "select": {
      if (empty) {
        if (field.required) fail("is required.");
        return null;
      }
      if (!field.options.some((o) => o.value === value)) fail("isn't one of the choices.");
      return value;
    }
    case "strings": {
      if (empty) return [];
      if (!Array.isArray(value)) fail("must be a list.");
      const seen = new Set();
      const out = [];
      for (const item of value) {
        if (typeof item !== "string") fail("must be a list of text.");
        let text = item.trim();
        if (field.lowercase) text = text.toLowerCase();
        if (!text) continue;
        if (field.itemMax && text.length > field.itemMax) fail(`“${text.slice(0, 20)}…” is longer than ${field.itemMax} characters.`);
        if (seen.has(text.toLowerCase())) continue;
        seen.add(text.toLowerCase());
        out.push(text);
      }
      if (field.max && out.length > field.max) fail(`can have at most ${field.max} entries.`);
      return out;
    }
    case "embed": {
      if (empty) return null;
      const name = String(value);
      if (!(ctx.embedNames ?? []).includes(name)) fail(`there's no saved embed called “${name}”. Make it on the Embeds page first.`);
      return name;
    }
    case "automodRule": {
      if (empty) {
        if (field.required) fail("pick a rule.");
        return null;
      }
      if (!ctx.automodRules) fail("Phoenix can't see this server's AutoMod rules. Give it the Manage Server permission.");
      const rule = ctx.automodRules.find((r) => r.id === String(value));
      if (!rule) fail("that AutoMod rule doesn't exist anymore.");
      return rule.id;
    }
    case "list": {
      if (empty) return [];
      if (!Array.isArray(value)) fail("must be a list.");
      // Some lists are bigger with Phoenix Plus (tools/limits.js).
      let max = field.limit ? ctx.limits?.[field.limit] ?? PLUS_LIMITS[field.limit].free : field.max;
      // A server over its limit (Plus ran out) can keep and edit what it has, just not add more.
      if (field.limit && Array.isArray(ctx.current?.[field.key])) max = Math.max(max, ctx.current[field.key].length);
      if (max && value.length > max) fail(field.limit ? limitMessage(field.limit, ctx.premium) : `can have at most ${max} entries.`);
      const rows = value.map((row, index) => {
        if (!row || typeof row !== "object") fail(`entry ${index + 1} is invalid.`);
        const out = {};
        for (const sub of field.fields) out[sub.key] = validateField(sub, row[sub.key], ctx, `${label} (entry ${index + 1}) ${sub.label}`);
        return out;
      });
      if (field.uniqueBy) {
        const seen = new Set();
        for (const row of rows) {
          const key = String(row[field.uniqueBy]);
          if (seen.has(key)) fail(`two entries have the same ${field.fields.find((f) => f.key === field.uniqueBy)?.label.toLowerCase()}.`);
          seen.add(key);
        }
      }
      return rows;
    }
    default:
      throw new ApiError(500, `Unknown field type ${field.type}`);
  }
}

/** Mutes Discord's timeouts can't do (permanent, or over 28 days) use the mute role. */
const needsMuteRole = (duration) => !duration || duration > 28 * 86_400_000;

/** Extra rules that involve more than one field. */
function checkSection(sectionId, values, doc) {
  const get = (key) => (key in values ? values[key] : doc.get(key));
  if (sectionId === "moderation") {
    for (const step of get("moderation.system") ?? []) {
      if (step.punishment === "mute" && !step.duration && !get("moderation.muteRole")) {
        throw new ApiError(400, `Punishment system: a mute at ${step.warnings} warnings needs a duration, or a mute role.`);
      }
    }
  }
  if (sectionId === "automod") {
    const { FILTERS } = require("../tools/automod");
    for (const name of FILTERS) {
      const key = `automod.filters.${name}`;
      if (get(`${key}.enabled`) && get(`${key}.action`) === "mute" && needsMuteRole(get(`${key}.duration`)) && !get("moderation.muteRole")) {
        const label = sections.find((s) => s.id === "automod").groups[name].label;
        throw new ApiError(400, `${label}: mutes that are permanent or longer than 28 days need a mute role (Moderation page).`, { field: `${key}.duration` });
      }
    }
  }
  if (sectionId === "discord-automod") {
    for (const rule of get("automod.discordRules") ?? []) {
      if (rule.action === "mute" && needsMuteRole(rule.duration) && !get("moderation.muteRole")) {
        throw new ApiError(400, "Linked rules: mutes that are permanent or longer than 28 days need a mute role (Moderation page).");
      }
    }
  }
  if (sectionId === "automod" && get("automod.honeypot.channel")) {
    if (get("automod.honeypot.action") === "shadowban" && !get("moderation.shadowBannedRole")) {
      throw new ApiError(400, "Honeypot: shadowbanning needs a shadowban role (Moderation page).", { field: "automod.honeypot.action" });
    }
    if ((get("automod.exemptChannels") ?? []).includes(get("automod.honeypot.channel"))) {
      throw new ApiError(400, "Honeypot: the honeypot channel can't also be an ignored channel.", { field: "automod.honeypot.channel" });
    }
  }
  if (sectionId === "autoresponses") {
    const { regexProblem } = require("../tools/autoresponse");
    (get("autoresponses") ?? []).forEach((entry, index) => {
      if (entry.match === "regex") {
        const problem = regexProblem(entry.trigger, entry.matchCase);
        if (problem) throw new ApiError(400, `Autoresponse ${index + 1}: the regex ${problem}`);
      }
      if (!entry.content && !entry.embed) throw new ApiError(400, `Autoresponse ${index + 1}: add a reply or an embed.`);
    });
  }
  for (const [listKey, label] of [["timedMessages", "Timed message"], ["stickyMessages", "Sticky message"]]) {
    if (sectionId !== (listKey === "timedMessages" ? "timed" : "sticky")) continue;
    (get(listKey) ?? []).forEach((entry, index) => {
      if (!entry.content && !entry.embed) throw new ApiError(400, `${label} ${index + 1}: add a message or an embed.`);
    });
  }
  if (sectionId === "leveling") {
    const min = get("leveling.rates.minimum") ?? 5;
    const max = get("leveling.rates.maximum") ?? 15;
    if (min > max) throw new ApiError(400, "Least XP per message can't be more than most XP per message.");
  }
}

router.patch("/guilds/:guildId/settings/:section", wrap(async (req, res) => {
  const section = sections.find((s) => s.id === req.params.section);
  if (!section) throw new ApiError(404, "Unknown settings page.");
  const input = req.body?.values;
  if (!input || typeof input !== "object") throw new ApiError(400, "Nothing to save.");

  const guildId = req.params.guildId;
  const needsRules = section.fields.some((f) => f.type === "automodRule" || f.fields?.some((sub) => sub.type === "automodRule"));
  const [doc, context, automodRules, premium] = await Promise.all([
    getSettingsDoc(guildId),
    getGuildContext(guildId),
    needsRules ? discord.getAutomodRules(guildId) : null,
    discord.hasPremium(guildId),
  ]);
  const before = settingsValues(doc);
  const ctx = { ...context, guildId, commands: commandList(), automodRules, embedNames: (doc.embeds ?? []).map((e) => e.name), premium, limits: limitsFor(premium), current: before };

  const clean = {};
  for (const [key, value] of Object.entries(input)) {
    const field = section.fields.find((f) => f.key === key);
    if (!field) throw new ApiError(400, `${key} isn't a setting on this page.`);
    clean[key] = validateField(field, value, ctx);
  }
  checkSection(section.id, clean, doc);

  for (const [key, value] of Object.entries(clean)) doc.set(key, value);
  // Saving the document (not updateOne) also clears the bot's Redis query cache.
  await doc.save();
  const after = settingsValues(doc);
  const changes = Object.keys(clean)
    .filter((key) => JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null))
    .map((key) => {
      const field = section.fields.find((f) => f.key === key);
      const group = field.group ? section.groups?.[field.group]?.label : null;
      const label = group && !field.groupToggle ? `${group}: ${field.label}` : group ? `${group} filter` : field.label;
      return { key, label, type: field.type, before: before[key], after: after[key] };
    });
  if (changes.length) await recordAudit(req, { action: "settings", summary: `Changed ${section.name} settings`, changes });
  res.json({ settings: after });
}));

// ---------------------------------------------------------------------------
// Role menus
// ---------------------------------------------------------------------------

function slug(name) {
  return String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "menu";
}

router.put("/guilds/:guildId/rolemenus", wrap(async (req, res) => {
  const guildId = req.params.guildId;
  const menus = req.body?.roleMenus;
  if (!Array.isArray(menus)) throw new ApiError(400, "Nothing to save.");
  const [doc, context, premium] = await Promise.all([getSettingsDoc(guildId), getGuildContext(guildId), discord.hasPremium(guildId)]);
  // Over the limit (Plus ran out): menus can still be edited or removed, not added.
  const limit = Math.max(limitsFor(premium).roleMenus, doc.rolesMenu?.length ?? 0);
  if (menus.length > limit) {
    throw new ApiError(400, limitMessage("roleMenus", premium));
  }

  const ctx = { ...context, guildId };
  const existingIds = new Set((doc.rolesMenu ?? []).map((m) => m.id));
  const usedIds = new Set();
  const clean = menus.map((menu, index) => {
    const label = `Role menu ${index + 1}`;
    const name = validateField({ key: "name", type: "text", min: 1, max: 50 }, menu.name, ctx, `${label} name`);
    // Ids are part of posted menus' buttons, so existing menus keep theirs.
    let id = existingIds.has(menu.id) ? menu.id : slug(name);
    while (usedIds.has(id)) id = `${slug(name).slice(0, 20)}-${Math.floor(Math.random() * 1000)}`;
    usedIds.add(id);
    const menutype = menu.menutype === "multi" ? "multi" : "one";
    if (!Array.isArray(menu.roles) || menu.roles.length > LIMITS.roleMenuRoles) {
      throw new ApiError(400, `${label}: a menu can have at most ${LIMITS.roleMenuRoles} roles.`);
    }
    const roles = menu.roles.map((item, i) => ({
      role: validateField({ key: "role", type: "role", assignable: true, required: true }, item.role, ctx, `${name} role ${i + 1}`),
      emoji: validateField({ key: "emoji", type: "emoji" }, item.emoji, ctx, `${name} role ${i + 1} emoji`) ?? "⭐",
    }));
    if (new Set(roles.map((r) => r.role)).size !== roles.length) throw new ApiError(400, `${name}: the same role is in the menu twice.`);
    return { id, name, menutype, roles };
  });

  const beforeCount = doc.rolesMenu?.length ?? 0;
  doc.rolesMenu = clean;
  await doc.save();
  await recordAudit(req, { action: "rolemenus", summary: "Saved the role menus", changes: [{ label: "Role menus", type: "list", before: { count: beforeCount }, after: { count: clean.length } }] });
  res.json({ roleMenus: roleMenusOf(doc) });
}));

function parseEmoji(text) {
  const custom = CUSTOM_EMOJI.exec(text ?? "");
  if (custom) return { id: custom[3], name: custom[2], animated: custom[1] === "a" };
  return { name: text || "⭐" };
}

router.post("/guilds/:guildId/rolemenus/:menuId/post", wrap(async (req, res) => {
  const guildId = req.params.guildId;
  const [doc, context] = await Promise.all([getSettingsDoc(guildId), getGuildContext(guildId)]);
  const menu = (doc.rolesMenu ?? []).find((m) => m.id === req.params.menuId);
  if (!menu) throw new ApiError(404, "That role menu doesn't exist. Save your changes first.");
  if (!menu.roles.length) throw new ApiError(400, "Add at least one role to the menu before posting it.");
  const ctx = { ...context, guildId };
  const channelId = validateField({ key: "channel", type: "channel", channelTypes: [0, 5], required: true }, req.body?.channelId, ctx, "Channel");
  const content = validateField({ key: "content", type: "textarea", max: 2000 }, req.body?.content, ctx, "Message") || `Pick your roles from **${menu.name}** below.`;

  const options = menu.roles
    .map((item) => ({ item, role: context.roles.get(item.role) }))
    .filter(({ role }) => role)
    .map(({ item, role }) => ({ label: role.name.slice(0, 100), value: role.id, emoji: parseEmoji(item.emoji) }));

  await discord.sendMessage(channelId, {
    content,
    allowed_mentions: { parse: [] },
    components: [{
      type: 1,
      components: [{
        type: 3,
        custom_id: `rm-${menu.id}`,
        placeholder: "Select a role to add or remove...",
        min_values: 0,
        max_values: menu.menutype === "multi" ? options.length : 1,
        options,
      }],
    }],
  }).catch((err) => {
    throw new ApiError(400, `Discord refused to post the menu: ${err.message}. Check that Phoenix can send messages in that channel.`);
  });
  await recordAudit(req, { action: "rolemenus.post", summary: `Posted the role menu “${menu.name}” in <#${channelId}>` });
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// Verification panel
// ---------------------------------------------------------------------------

router.post("/guilds/:guildId/verification/post", wrap(async (req, res) => {
  const guildId = req.params.guildId;
  const [doc, context] = await Promise.all([getSettingsDoc(guildId), getGuildContext(guildId)]);
  if (!doc.verification?.role) throw new ApiError(400, "Pick a verified role and save before posting the panel.");
  const ctx = { ...context, guildId };
  const channelId = validateField({ key: "channel", type: "channel", channelTypes: [0, 5], required: true }, req.body?.channelId, ctx, "Channel");
  const label = validateField({ key: "label", type: "text", max: 80 }, req.body?.label, ctx, "Button text") || "Verify";
  const emojiText = validateField({ key: "emoji", type: "emoji" }, req.body?.emoji, ctx, "Button emoji");
  const buttonEmoji = emojiText ? parseEmoji(emojiText) : undefined;
  // Server placeholders are filled in. There's no member yet, so member ones come out empty.
  const fill = contextFrom({ guild: req.guild, channel: context.channels.get(channelId) });
  const text = render(doc.verification.messageText || "Press the button below to verify and get access to the server.", fill);
  // With a saved embed, the text goes above it. Without one, it goes in the usual orange box.
  const message = doc.verification.embed
    ? buildMessage(doc, { content: doc.verification.messageText ?? "", embed: doc.verification.embed }, fill)
    : null;
  const body = message
    ? { content: message.content, embeds: message.embeds }
    : { embeds: [new EmbedBuilder().setDescription(text.slice(0, 4096) || "Press the button below to verify.").setColor(Colors.Orange).toJSON()] };

  await discord.sendMessage(channelId, {
    ...body,
    allowed_mentions: { parse: [] },
    components: [{ type: 1, components: [{ type: 2, style: 1, custom_id: "verify", label, emoji: buttonEmoji }] }],
  }).catch((err) => {
    throw new ApiError(400, `Discord refused to post the panel: ${err.message}. Check that Phoenix can send messages in that channel.`);
  });
  await recordAudit(req, { action: "verification.post", summary: `Posted the verification panel in <#${channelId}>` });
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// Honeypot warning
// ---------------------------------------------------------------------------

router.post("/guilds/:guildId/honeypot/warning", wrap(async (req, res) => {
  const doc = await getSettingsDoc(req.params.guildId);
  const honeypot = doc.automod?.honeypot;
  if (!honeypot?.channel) throw new ApiError(400, "Pick and save a honeypot channel first.");
  const context = await getGuildContext(req.params.guildId);
  // Server placeholders are filled in; nobody in particular is the member here.
  const fill = contextFrom({ guild: req.guild, channel: context.channels.get(honeypot.channel) });
  // With a saved embed, the warning text (if any) goes above it. Without one, the
  // text goes in the usual red box.
  const message = honeypot.embed ? buildMessage(doc, { content: honeypot.warning ?? "", embed: honeypot.embed }, fill) : null;
  const body = message
    ? { content: message.content, embeds: message.embeds }
    : { embeds: [new EmbedBuilder().setDescription(render(honeypot.warning || HONEYPOT_WARNING, fill).slice(0, 4096) || HONEYPOT_WARNING).setColor(Colors.Red).toJSON()] };
  await discord.sendMessage(honeypot.channel, { ...body, allowed_mentions: { parse: [] } }).catch((err) => {
    throw new ApiError(400, `Discord refused to post the warning: ${err.message}. Check that Phoenix can send messages in that channel.`);
  });
  await recordAudit(req, { action: "honeypot.post", summary: `Posted the honeypot warning in <#${honeypot.channel}>` });
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

router.post("/guilds/:guildId/tags", wrap(async (req, res) => {
  const guildId = req.params.guildId;
  const [doc, premium] = await Promise.all([getSettingsDoc(guildId), discord.hasPremium(guildId)]);
  const ctx = { guildId };
  const name = validateField({ key: "name", type: "text", min: 1, max: 12, noSpaces: true }, req.body?.name, ctx, "Tag name");
  const { description, embed } = tagBody(doc, req.body);
  const builtIn = require("../tools/infoStuff.json");
  if (doc.tags.some((t) => t.name?.toLowerCase() === name.toLowerCase()) || builtIn.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
    throw new ApiError(400, `A tag called ${name} already exists.`);
  }
  const limit = limitsFor(premium).tags;
  if (doc.tags.length >= limit) throw new ApiError(400, limitMessage("tags", premium));
  doc.tags.push({ name, description, embed, creator: req.session.user.username });
  await doc.save();
  await recordAudit(req, { action: "tags.add", summary: `Added the tag “${name}”`, changes: [{ label: "Text", before: null, after: description }, { label: "Embed", before: null, after: embed }] });
  res.json({ tags: tagsOf(doc) });
}));

router.put("/guilds/:guildId/tags/:name", wrap(async (req, res) => {
  const doc = await getSettingsDoc(req.params.guildId);
  const tag = doc.tags.find((t) => t.name === req.params.name);
  if (!tag) throw new ApiError(404, "That tag doesn't exist.");
  const oldTag = { description: tag.description, embed: tag.embed };
  Object.assign(tag, tagBody(doc, req.body));
  await doc.save();
  await recordAudit(req, { action: "tags.edit", summary: `Edited the tag “${tag.name}”`, changes: [{ label: "Text", before: oldTag.description, after: tag.description }, { label: "Embed", before: oldTag.embed, after: tag.embed }] });
  res.json({ tags: tagsOf(doc) });
}));

router.delete("/guilds/:guildId/tags/:name", wrap(async (req, res) => {
  const doc = await getSettingsDoc(req.params.guildId);
  const tag = doc.tags.find((t) => t.name === req.params.name);
  if (!tag) throw new ApiError(404, "That tag doesn't exist.");
  doc.tags.pull(tag);
  await doc.save();
  await recordAudit(req, { action: "tags.delete", summary: `Deleted the tag “${tag.name}”`, changes: [{ label: "Text", before: tag.description, after: null }] });
  res.json({ tags: tagsOf(doc) });
}));

// ---------------------------------------------------------------------------
// Saved embeds (the same ones /embed saves and loads)
// ---------------------------------------------------------------------------

function cleanEmbed(input) {
  try {
    return cleanEmbedData(input);
  }
  catch (err) {
    if (err instanceof EmbedError) throw new ApiError(400, err.message);
    throw err;
  }
}

function embedName(raw) {
  const name = validateField({ key: "name", type: "text", min: 1, max: 15 }, raw, {}, "Embed name");
  return name;
}

router.put("/guilds/:guildId/embeds/:name", wrap(async (req, res) => {
  const guildId = req.params.guildId;
  const name = embedName(req.params.name);
  const data = cleanEmbed(req.body?.data);
  const [doc, premium] = await Promise.all([getSettingsDoc(guildId), discord.hasPremium(guildId)]);
  const index = doc.embeds.findIndex((e) => e.name === name);
  const limit = limitsFor(premium).embeds;
  if (index === -1 && doc.embeds.length >= limit) {
    throw new ApiError(400, premium
      ? `You can save up to ${limit} embeds. Delete one to make room.`
      : `Free servers can save ${limit} embeds. Delete one, or get Phoenix Plus for ${LIMITS.embeds.premium}.`);
  }
  if (index === -1) doc.embeds.push({ name, data });
  else doc.embeds.set(index, { name, data });
  await doc.save();
  await recordAudit(req, { action: "embeds.save", summary: `${index === -1 ? "Saved a new" : "Updated the"} embed “${name}”` });
  res.json({ embeds: embedsOf(doc) });
}));

router.delete("/guilds/:guildId/embeds/:name", wrap(async (req, res) => {
  const doc = await getSettingsDoc(req.params.guildId);
  const entry = doc.embeds.find((e) => e.name === req.params.name);
  if (!entry) throw new ApiError(404, "That embed doesn't exist.");
  // Don't leave tags and messages pointing at an embed that's gone.
  const users = embedUsers(doc, entry.name);
  if (users.length) throw new ApiError(400, `This embed is used by ${describeUsers(users)}. Remove it from those first.`);
  doc.embeds.pull(entry);
  await doc.save();
  await recordAudit(req, { action: "embeds.delete", summary: `Deleted the embed “${entry.name}”` });
  res.json({ embeds: embedsOf(doc) });
}));

router.post("/guilds/:guildId/embeds/send", wrap(async (req, res) => {
  const guildId = req.params.guildId;
  const context = await getGuildContext(guildId);
  const ctx = { ...context, guildId };
  const channelId = validateField({ key: "channel", type: "channel", channelTypes: [0, 5], required: true }, req.body?.channelId, ctx, "Channel");
  const content = validateField({ key: "content", type: "textarea", max: 2000 }, req.body?.content, ctx, "Message");
  const data = cleanEmbed(req.body?.data);

  // Placeholders are filled in with you (the person sending it) as the member.
  const user = req.session.user;
  const fill = contextFrom({ user: { id: user.id, username: user.username, global_name: user.globalName, avatar: user.avatar }, guild: req.guild, channel: context.channels.get(channelId) });
  const filled = renderEmbed(data, fill);
  if (isEmptyEmbed(filled)) throw new ApiError(400, "The embed is empty once its placeholders are filled in.");
  await discord.sendMessage(channelId, {
    content: content ? render(content, fill) : undefined,
    embeds: [toDiscordEmbed(filled)],
    allowed_mentions: { parse: [] },
  }).catch((err) => {
    throw new ApiError(400, `Discord refused the embed: ${err.message}. Check that Phoenix can send messages and embeds in that channel, and that image links point to images.`);
  });
  await recordAudit(req, { action: "embeds.send", summary: `Sent an embed${data.title ? ` (“${data.title.slice(0, 80)}”)` : ""} to <#${channelId}>` });
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

const CASES_PER_PAGE = 25;

router.get("/guilds/:guildId/cases", wrap(async (req, res) => {
  const guildId = req.params.guildId;
  const filter = { guildId };
  if (SNOWFLAKE.test(req.query.member ?? "")) filter.member = req.query.member;
  if (typeof req.query.type === "string" && /^[a-z ]{1,20}$/i.test(req.query.type)) {
    filter.punishment = { $regex: `^${req.query.type}`, $options: "i" };
  }
  const page = Math.max(0, Number.parseInt(req.query.page, 10) || 0);
  const [cases, total] = await Promise.all([
    Case.find(filter).sort({ caseId: -1 }).skip(page * CASES_PER_PAGE).limit(CASES_PER_PAGE).lean(),
    Case.countDocuments(filter),
  ]);
  const ids = [...new Set(cases.flatMap((c) => [c.member, c.moderator]).filter((id) => SNOWFLAKE.test(id ?? "")))];
  const profiles = await Promise.all(ids.map((id) => discord.getUser(id)));
  res.json({
    page,
    pages: Math.max(1, Math.ceil(total / CASES_PER_PAGE)),
    total,
    cases: cases.map(({ _id: _ignored, ...c }) => c),
    users: Object.fromEntries(ids.map((id, i) => [id, profiles[i]?.global_name || profiles[i]?.username || null])),
  });
}));

async function editModlog(guildId, caseDoc, embed) {
  const settings = await ServerSettings.findById(guildId).select("logging").lean();
  const channelId = settings?.logging?.infractions;
  if (!channelId || !caseDoc.modlogID) return;
  await discord.rest
    .patch(`/channels/${channelId}/messages/${caseDoc.modlogID}`, { body: { embeds: [embed.toJSON()] } })
    .catch(() => undefined);
}

router.patch("/guilds/:guildId/cases/:caseId", wrap(async (req, res) => {
  const guildId = req.params.guildId;
  const caseDoc = await Case.findCase(guildId, Number(req.params.caseId));
  if (!caseDoc) throw new ApiError(404, "That case doesn't exist.");
  const reason = validateField({ key: "reason", type: "textarea", min: 1, max: 1000 }, req.body?.reason, {}, "Reason");
  const oldReason = caseDoc.reason;
  caseDoc.reason = reason;
  caseDoc.moderator = req.session.user.id;
  await caseDoc.save();
  await editModlog(guildId, caseDoc, await buildModlogEmbed(caseDoc));
  const { _id: _ignored, ...out } = caseDoc.toObject();
  await recordAudit(req, { action: "cases.reason", summary: `Changed the reason for case ${caseDoc.caseId}`, changes: [{ label: "Reason", before: oldReason, after: reason }] });
  res.json({ case: out });
}));

router.post("/guilds/:guildId/cases/:caseId/pardon", wrap(async (req, res) => {
  const guildId = req.params.guildId;
  const caseDoc = await Case.findCase(guildId, Number(req.params.caseId));
  if (!caseDoc) throw new ApiError(404, "That case doesn't exist.");
  if (caseDoc.punishment !== "Warn") throw new ApiError(400, "Only active warnings can be pardoned.");
  caseDoc.punishment = "Warn (pardoned)";
  caseDoc.expired = true;
  await caseDoc.save();
  await editModlog(guildId, caseDoc, await buildModlogEmbed(caseDoc));
  const { _id: _ignored, ...out } = caseDoc.toObject();
  await recordAudit(req, { action: "cases.pardon", summary: `Pardoned case ${caseDoc.caseId} (a warning for <@${caseDoc.member}>)` });
  res.json({ case: out });
}));

// ---------------------------------------------------------------------------
// Leveling
// ---------------------------------------------------------------------------

const LEVELS_PER_PAGE = 25;
const MAX_LEVEL = 10_000;

function avatarUrl(user) {
  if (!user) return null;
  return user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(user.id) >> 22n) % 6n)}.png`;
}

async function levelRows(entries, rankOf) {
  const users = await Promise.all(entries.map((m) => discord.getUser(m.userId)));
  return Promise.all(entries.map(async (m, i) => ({
    userId: m.userId,
    username: users[i]?.username ?? null,
    displayName: users[i]?.global_name || users[i]?.username || null,
    avatar: avatarUrl(users[i]),
    level: m.level,
    xp: m.xp,
    needed: xpForLevel(m.level),
    rank: await rankOf(m, i),
  })));
}

// Everyone's levels, best first, with search by user id or name.
router.get("/guilds/:guildId/levels", wrap(async (req, res) => {
  const guildId = req.params.guildId;
  const search = String(req.query.search ?? "").trim().slice(0, 100);
  const page = Math.max(0, Number.parseInt(req.query.page, 10) || 0);
  const filter = { guildId };

  if (SNOWFLAKE.test(search)) {
    filter.userId = search;
  }
  else if (search) {
    // Discord's member search matches the start of usernames and nicknames.
    const found = await discord.rest
      .get(`/guilds/${guildId}/members/search`, { query: new URLSearchParams({ query: search, limit: "100" }) })
      .catch(() => []);
    filter.userId = { $in: found.map((m) => m.user.id) };
  }

  const [entries, total] = await Promise.all([
    LevelMember.find(filter).sort({ level: -1, xp: -1 }).skip(page * LEVELS_PER_PAGE).limit(LEVELS_PER_PAGE).lean(),
    LevelMember.countDocuments(filter),
  ]);
  const { getRank } = require("../tools/leveling");
  const members = await levelRows(entries, (m, i) => (search ? getRank(guildId, m) : page * LEVELS_PER_PAGE + i + 1));
  res.json({ page, pages: Math.max(1, Math.ceil(total / LEVELS_PER_PAGE)), total, members });
}));

// Set someone's level and XP. Also adds people who don't have a level yet.
router.put("/guilds/:guildId/levels/:userId", wrap(async (req, res) => {
  const { guildId, userId } = req.params;
  if (!SNOWFLAKE.test(userId)) throw new ApiError(400, "That isn't a user id.");
  const level = validateField({ key: "level", type: "number", min: 0, max: MAX_LEVEL, required: true }, req.body?.level, {}, "Level");
  const xp = validateField({ key: "xp", type: "number", min: 0, max: Math.max(0, xpForLevel(level) - 1), required: true }, req.body?.xp ?? 0, {}, "XP");
  const user = await discord.getUser(userId);
  if (!user) throw new ApiError(404, "No Discord user has that id.");
  if (user.bot) throw new ApiError(400, "Bots can't have levels.");
  const previous = await LevelMember.findOne({ guildId, userId }).lean();
  const entry = await LevelMember.findOneAndUpdate(
    { guildId, userId },
    { $set: { level, xp } },
    { upsert: true, new: true, lean: true },
  );
  const { getRank } = require("../tools/leveling");
  const [member] = await levelRows([entry], (m) => getRank(guildId, m));
  await recordAudit(req, { action: "levels.set", summary: `Set <@${userId}>'s level`, changes: [{ label: "Level", type: "number", before: previous?.level ?? null, after: level }, { label: "XP", type: "number", before: previous?.xp ?? null, after: xp }] });
  res.json({ member });
}));

router.delete("/guilds/:guildId/levels/:userId", wrap(async (req, res) => {
  const { guildId, userId } = req.params;
  if (!SNOWFLAKE.test(userId)) throw new ApiError(400, "That isn't a user id.");
  const result = await LevelMember.deleteOne({ guildId, userId });
  if (!result.deletedCount) throw new ApiError(404, "That person doesn't have a level.");
  await recordAudit(req, { action: "levels.delete", summary: `Deleted <@${userId}>'s level` });
  res.json({ ok: true });
}));

// Resetting everyone needs the server's name typed in, like GitHub's delete prompt.
router.delete("/guilds/:guildId/levels", wrap(async (req, res) => {
  if (String(req.body?.confirm ?? "").trim() !== req.guild.name) {
    throw new ApiError(400, "Type the server's name to confirm resetting everyone's levels.");
  }
  const result = await LevelMember.deleteMany({ guildId: req.params.guildId });
  await recordAudit(req, { action: "levels.reset", summary: `Reset everyone's levels (${result.deletedCount} members)` });
  res.json({ ok: true, deleted: result.deletedCount });
}));

// ---------------------------------------------------------------------------
// Bot profile (nickname and server avatar)
// ---------------------------------------------------------------------------

const MAX_AVATAR = 8 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

async function updateBotMember(guildId, body, savedBio) {
  const member = await discord.rest
    .patch(`/guilds/${guildId}/members/@me`, { body, reason: "Changed on the Phoenix dashboard" })
    .catch((err) => {
      if (err?.code === 50013) throw new ApiError(403, "Phoenix needs the Change Nickname permission to change its nickname here.");
      if (err?.code === 50035) throw new ApiError(400, `Discord refused that: ${err.rawError?.errors ? JSON.stringify(err.rawError.errors).slice(0, 200) : err.message}`);
      throw new ApiError(400, `Discord refused that: ${err.message}`);
    });
  return profileOf(guildId, member, savedBio);
}

// Nickname and bio. Send only the ones that changed.
router.patch("/guilds/:guildId/profile", wrap(async (req, res) => {
  const body = {};
  if ("nick" in (req.body ?? {})) body.nick = validateField({ key: "nick", type: "text", max: 32 }, req.body.nick, {}, "Nickname") ?? null;
  if ("bio" in (req.body ?? {})) body.bio = validateField({ key: "bio", type: "textarea", max: 190 }, req.body.bio, {}, "Bio")?.trim() || null;
  if (!Object.keys(body).length) throw new ApiError(400, "Nothing to change.");
  const doc = await getSettingsDoc(req.params.guildId);
  const profile = await updateBotMember(req.params.guildId, body, "bio" in body ? body.bio : doc.botProfile?.bio);
  if ("bio" in body) {
    doc.set("botProfile.bio", body.bio);
    await doc.save();
  }
  await recordAudit(req, {
    action: "profile",
    summary: "Changed Phoenix's profile",
    changes: [
      ...("nick" in body ? [{ label: "Nickname", after: body.nick }] : []),
      ...("bio" in body ? [{ label: "Bio", after: body.bio }] : []),
    ],
  });
  res.json({ profile });
}));

router.put(
  "/guilds/:guildId/profile/:image(avatar|banner)",
  express.raw({ type: IMAGE_TYPES, limit: MAX_AVATAR }),
  wrap(async (req, res) => {
    const buffer = req.body;
    const type = req.get("Content-Type")?.split(";")[0];
    if (!Buffer.isBuffer(buffer) || !buffer.length || !IMAGE_TYPES.includes(type)) {
      throw new ApiError(400, "The image has to be a PNG, JPEG, GIF or WebP file.");
    }
    if (!looksLikeImage(buffer, type)) throw new ApiError(400, "That file isn't the kind of image it says it is.");
    // Animated server avatars are a Nitro perk for people, but bots can always use them.
    const image = `data:${type};base64,${buffer.toString("base64")}`;
    const doc = await getSettingsDoc(req.params.guildId);
    const profile = await updateBotMember(req.params.guildId, { [req.params.image]: image }, doc.botProfile?.bio);
    await recordAudit(req, { action: "profile", summary: `Changed Phoenix's server ${req.params.image}` });
    res.json({ profile });
  }),
);

router.delete("/guilds/:guildId/profile/:image(avatar|banner)", wrap(async (req, res) => {
  const doc = await getSettingsDoc(req.params.guildId);
  const profile = await updateBotMember(req.params.guildId, { [req.params.image]: null }, doc.botProfile?.bio);
  await recordAudit(req, { action: "profile", summary: `Removed Phoenix's server ${req.params.image}` });
  res.json({ profile });
}));

function looksLikeImage(buffer, type) {
  const starts = (...bytes) => bytes.every((b, i) => buffer[i] === b);
  switch (type) {
    case "image/png": return buffer.subarray(0, 8).equals(PNG_SIGNATURE);
    case "image/jpeg": return starts(0xff, 0xd8, 0xff);
    case "image/gif": return buffer.subarray(0, 4).toString("latin1") === "GIF8";
    case "image/webp": return buffer.subarray(0, 4).toString("latin1") === "RIFF" && buffer.subarray(8, 12).toString("latin1") === "WEBP";
    default: return false;
  }
}

const MAX_BACKGROUND = 8 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// The image is sent as the raw request body (Content-Type: image/png), not as
// base64 in JSON, so it's a third smaller and isn't limited by the JSON parser.
router.put(
  "/guilds/:guildId/leveling/background",
  express.raw({ type: "image/png", limit: MAX_BACKGROUND }),
  wrap(async (req, res) => {
    const buffer = req.body;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new ApiError(400, "The background has to be a PNG image.");
    // Check the PNG signature, so only real images are stored.
    if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new ApiError(400, "That file isn't a PNG image.");
    await fs.promises.mkdir(RANKCARD_DIR, { recursive: true });
    await fs.promises.writeFile(path.join(RANKCARD_DIR, `${req.params.guildId}-rankcard.png`), buffer);
    await recordAudit(req, { action: "leveling.background", summary: "Changed the rank card background" });
    res.json({ ok: true });
  }),
);

router.delete("/guilds/:guildId/leveling/background", wrap(async (req, res) => {
  await fs.promises.rm(path.join(RANKCARD_DIR, `${req.params.guildId}-rankcard.png`), { force: true });
  await recordAudit(req, { action: "leveling.background", summary: "Removed the rank card background" });
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

router.get("/guilds/:guildId/audit", wrap(async (req, res) => {
  const page = Math.max(0, Number.parseInt(req.query.page, 10) || 0);
  const userId = SNOWFLAKE.test(req.query.user ?? "") ? req.query.user : null;
  res.json(await listAudit(req.params.guildId, { page, userId }));
}));

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

router.use((req, res) => res.status(404).json({ error: "not_found", message: "Unknown dashboard API route." }));

// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  if (err?.name === "Error" && err.status && err.status < 500 && !(err instanceof ApiError)) {
    return res.status(err.status).json({ error: "invalid", message: err.message, field: err.field });
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.extra.error ?? "invalid", message: err.message, ...err.extra });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "too_large", message: "That image is too big. Images can be at most 8 MB." });
  }
  console.error("[dashboard] API error", err);
  res.status(500).json({ error: "server_error", message: "Something went wrong on our side. Try again in a moment." });
});

module.exports = router;
// Exposed for tests only.
module.exports.__test = { validateField, checkSection, ApiError };
