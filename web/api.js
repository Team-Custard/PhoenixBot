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
const { SAVED_LIMIT, EmbedError, cleanEmbedData, toDiscordEmbed } = require("../tools/embeds");
const { sections, fieldsByKey } = require("./spec");
const discord = require("./discord");
const { refreshGuilds, logout } = require("./session");

const router = express.Router();
const RANKCARD_DIR = path.join(__dirname, "../static/rankcards");
const SNOWFLAKE = /^\d{17,20}$/;
const CUSTOM_EMOJI = /^<(a?):(\w{2,32}):(\d{17,20})>$/;
const UNICODE_EMOJI = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Regional_Indicator}{2})(️|‍|\p{Extended_Pictographic}|\p{Emoji_Modifier}|⃣)*$/u;

const LIMITS = {
  roleMenus: { free: 3, premium: 20 },
  roleMenuRoles: 16,
  tags: { free: 25, premium: 500 },
};

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

/** The bot's name and avatar in a server, for the Bot profile page. */
function profileOf(guildId, member) {
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
  return (doc.tags ?? []).map((t) => ({ name: t.name, description: t.description, creator: t.creator }));
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
    guild: { id: req.guild.id, name: req.guild.name, icon: req.guild.icon, ownerId: req.guild.owner_id },
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
      profile: profileOf(guildId, context.botMember),
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
    limits: {
      roleMenus: premium ? LIMITS.roleMenus.premium : LIMITS.roleMenus.free,
      roleMenuRoles: LIMITS.roleMenuRoles,
      tags: premium ? LIMITS.tags.premium : LIMITS.tags.free,
      embeds: premium ? SAVED_LIMIT.premium : SAVED_LIMIT.free,
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
      if (typeof value !== "boolean") fail("must be on or off.");
      return value;
    case "number": {
      if (empty) {
        if (field.required) fail("is required.");
        return null;
      }
      const n = Number(value);
      if (!Number.isInteger(n)) fail("must be a whole number.");
      if (field.min !== undefined && n < field.min) fail(`must be at least ${field.min}.`);
      if (field.max !== undefined && n > field.max) fail(`must be at most ${field.max}.`);
      return field.storeAs === "string" ? String(n) : n;
    }
    case "duration": {
      if (empty) return 0;
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
      if (field.max && value.length > field.max) fail(`can have at most ${field.max} entries.`);
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
  const [doc, context, automodRules] = await Promise.all([
    getSettingsDoc(guildId),
    getGuildContext(guildId),
    needsRules ? discord.getAutomodRules(guildId) : null,
  ]);
  const ctx = { ...context, guildId, commands: commandList(), automodRules };

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
  res.json({ settings: settingsValues(doc) });
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
  const limit = premium ? LIMITS.roleMenus.premium : LIMITS.roleMenus.free;
  if (menus.length > limit) {
    throw new ApiError(400, premium ? `You can have up to ${limit} role menus.` : `Free servers can have ${limit} role menus. Phoenix Plus raises this to ${LIMITS.roleMenus.premium}.`);
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

  doc.rolesMenu = clean;
  await doc.save();
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
  const content = doc.verification.messageText || "Press the button below to verify and get access to the server.";

  await discord.sendMessage(channelId, {
    embeds: [new EmbedBuilder().setDescription(content).setColor(Colors.Orange).toJSON()],
    components: [{ type: 1, components: [{ type: 2, style: 1, custom_id: "verify", label }] }],
  }).catch((err) => {
    throw new ApiError(400, `Discord refused to post the panel: ${err.message}. Check that Phoenix can send messages in that channel.`);
  });
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
  const description = validateField({ key: "description", type: "textarea", min: 1, max: 2048 }, req.body?.description, ctx, "Tag text");
  const builtIn = require("../tools/infoStuff.json");
  if (doc.tags.some((t) => t.name?.toLowerCase() === name.toLowerCase()) || builtIn.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
    throw new ApiError(400, `A tag called ${name} already exists.`);
  }
  const limit = premium ? LIMITS.tags.premium : LIMITS.tags.free;
  if (doc.tags.length >= limit) throw new ApiError(400, `This server has reached its limit of ${limit} tags.`);
  doc.tags.push({ name, description, creator: req.session.user.username });
  await doc.save();
  res.json({ tags: tagsOf(doc) });
}));

router.delete("/guilds/:guildId/tags/:name", wrap(async (req, res) => {
  const doc = await getSettingsDoc(req.params.guildId);
  const tag = doc.tags.find((t) => t.name === req.params.name);
  if (!tag) throw new ApiError(404, "That tag doesn't exist.");
  doc.tags.pull(tag);
  await doc.save();
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
  const limit = premium ? SAVED_LIMIT.premium : SAVED_LIMIT.free;
  if (index === -1 && doc.embeds.length >= limit) {
    throw new ApiError(400, premium
      ? `You can save up to ${limit} embeds. Delete one to make room.`
      : `Free servers can save ${limit} embeds. Delete one, or get Phoenix Plus for ${SAVED_LIMIT.premium}.`);
  }
  if (index === -1) doc.embeds.push({ name, data });
  else doc.embeds.set(index, { name, data });
  await doc.save();
  res.json({ embeds: embedsOf(doc) });
}));

router.delete("/guilds/:guildId/embeds/:name", wrap(async (req, res) => {
  const doc = await getSettingsDoc(req.params.guildId);
  const entry = doc.embeds.find((e) => e.name === req.params.name);
  if (!entry) throw new ApiError(404, "That embed doesn't exist.");
  doc.embeds.pull(entry);
  await doc.save();
  res.json({ embeds: embedsOf(doc) });
}));

router.post("/guilds/:guildId/embeds/send", wrap(async (req, res) => {
  const guildId = req.params.guildId;
  const context = await getGuildContext(guildId);
  const ctx = { ...context, guildId };
  const channelId = validateField({ key: "channel", type: "channel", channelTypes: [0, 5], required: true }, req.body?.channelId, ctx, "Channel");
  const content = validateField({ key: "content", type: "textarea", max: 2000 }, req.body?.content, ctx, "Message");
  const data = cleanEmbed(req.body?.data);

  await discord.sendMessage(channelId, {
    content: content || undefined,
    embeds: [toDiscordEmbed(data)],
    allowed_mentions: { parse: [] },
  }).catch((err) => {
    throw new ApiError(400, `Discord refused the embed: ${err.message}. Check that Phoenix can send messages and embeds in that channel, and that image links point to images.`);
  });
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
  caseDoc.reason = reason;
  caseDoc.moderator = req.session.user.id;
  await caseDoc.save();
  await editModlog(guildId, caseDoc, await buildModlogEmbed(caseDoc));
  const { _id: _ignored, ...out } = caseDoc.toObject();
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
  const entry = await LevelMember.findOneAndUpdate(
    { guildId, userId },
    { $set: { level, xp } },
    { upsert: true, new: true, lean: true },
  );
  const { getRank } = require("../tools/leveling");
  const [member] = await levelRows([entry], (m) => getRank(guildId, m));
  res.json({ member });
}));

router.delete("/guilds/:guildId/levels/:userId", wrap(async (req, res) => {
  const { guildId, userId } = req.params;
  if (!SNOWFLAKE.test(userId)) throw new ApiError(400, "That isn't a user id.");
  const result = await LevelMember.deleteOne({ guildId, userId });
  if (!result.deletedCount) throw new ApiError(404, "That person doesn't have a level.");
  res.json({ ok: true });
}));

// Resetting everyone needs the server's name typed in, like GitHub's delete prompt.
router.delete("/guilds/:guildId/levels", wrap(async (req, res) => {
  if (String(req.body?.confirm ?? "").trim() !== req.guild.name) {
    throw new ApiError(400, "Type the server's name to confirm resetting everyone's levels.");
  }
  const result = await LevelMember.deleteMany({ guildId: req.params.guildId });
  res.json({ ok: true, deleted: result.deletedCount });
}));

// ---------------------------------------------------------------------------
// Bot profile (nickname and server avatar)
// ---------------------------------------------------------------------------

const MAX_AVATAR = 8 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

async function updateBotMember(guildId, body) {
  const member = await discord.rest
    .patch(`/guilds/${guildId}/members/@me`, { body, reason: "Changed on the Phoenix dashboard" })
    .catch((err) => {
      if (err?.code === 50013) throw new ApiError(403, "Phoenix needs the Change Nickname permission to change its nickname here.");
      if (err?.code === 50035) throw new ApiError(400, `Discord refused that: ${err.rawError?.errors ? JSON.stringify(err.rawError.errors).slice(0, 200) : err.message}`);
      throw new ApiError(400, `Discord refused that: ${err.message}`);
    });
  return profileOf(guildId, member);
}

router.patch("/guilds/:guildId/profile", wrap(async (req, res) => {
  const nick = validateField({ key: "nick", type: "text", max: 32 }, req.body?.nick, {}, "Nickname");
  res.json({ profile: await updateBotMember(req.params.guildId, { nick: nick ?? null }) });
}));

router.put(
  "/guilds/:guildId/profile/avatar",
  express.raw({ type: IMAGE_TYPES, limit: MAX_AVATAR }),
  wrap(async (req, res) => {
    const buffer = req.body;
    const type = req.get("Content-Type")?.split(";")[0];
    if (!Buffer.isBuffer(buffer) || !buffer.length || !IMAGE_TYPES.includes(type)) {
      throw new ApiError(400, "The avatar has to be a PNG, JPEG, GIF or WebP image.");
    }
    if (!looksLikeImage(buffer, type)) throw new ApiError(400, "That file isn't the kind of image it says it is.");
    // Animated server avatars are a Nitro perk for people, but bots can always use them.
    const avatar = `data:${type};base64,${buffer.toString("base64")}`;
    res.json({ profile: await updateBotMember(req.params.guildId, { avatar }) });
  }),
);

router.delete("/guilds/:guildId/profile/avatar", wrap(async (req, res) => {
  res.json({ profile: await updateBotMember(req.params.guildId, { avatar: null }) });
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
    res.json({ ok: true });
  }),
);

router.delete("/guilds/:guildId/leveling/background", wrap(async (req, res) => {
  await fs.promises.rm(path.join(RANKCARD_DIR, `${req.params.guildId}-rankcard.png`), { force: true });
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

router.use((req, res) => res.status(404).json({ error: "not_found", message: "Unknown dashboard API route." }));

// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
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
