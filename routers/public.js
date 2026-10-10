// JSON for the public website (frontend/src/site): stats, the command list, public
// leaderboards and UserDB profiles. Everything here is cached briefly, since anyone
// can call it.
const express = require("express");
const ServerSettings = require("../tools/SettingsSchema");
const LevelMember = require("../tools/models/LevelMember");
const xpForLevel = require("../tools/xpToLevel");
const { getCatalog } = require("../tools/commandCatalog");
const { botmode } = require("../tools/config");
const { TtlCache } = require("../web/cache");
const discord = require("../web/discord");

const router = express.Router();
const SNOWFLAKE = /^\d{17,20}$/;
const statsCache = new TtlCache(5 * 60_000);
const boardCache = new TtlCache(60_000, 5_000);
const LEADERBOARD_SIZE = 100;

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function avatarUrl(user, size = 128) {
  if (!user) return null;
  if (!user.avatar) return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(user.id) >> 22n) % 6n)}.png`;
  const ext = user.avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=${size}`;
}

router.use("/api/public", (req, res, next) => {
  res.setHeader("Cache-Control", "public, max-age=30");
  next();
});

// Server and member counts for the home page, added up across clusters.
router.get("/api/public/stats", wrap(async (req, res) => {
  const stats = await statsCache.wrap("stats", async () => {
    const { container } = require("@sapphire/framework");
    const client = container.client;
    let servers = null;
    let members = null;
    if (client?.cluster) {
      const results = await client.cluster
        .broadcastEval((c) => [c.guilds.cache.size, c.guilds.cache.reduce((sum, g) => sum + (g.memberCount ?? 0), 0)], { timeout: 5_000 })
        .catch(() => null);
      if (results) {
        servers = results.reduce((sum, [g]) => sum + g, 0);
        members = results.reduce((sum, [, m]) => sum + m, 0);
      }
    }
    else if (client?.guilds) {
      servers = client.guilds.cache.size;
      members = client.guilds.cache.reduce((sum, g) => sum + (g.memberCount ?? 0), 0);
    }
    return { servers, members, commands: getCatalog().commands.length };
  });
  res.json({ ...stats, mode: botmode });
}));

router.get("/api/public/commands", (req, res) => {
  res.json(getCatalog());
});

// Leaderboards and profiles cost database (and sometimes Discord) requests, so each
// visitor gets a limited number per minute.
const buckets = new Map();
function rateLimit(req, res, next) {
  const now = Date.now();
  const bucket = buckets.get(req.ip) ?? { count: 0, reset: now + 60_000 };
  if (bucket.reset < now) Object.assign(bucket, { count: 0, reset: now + 60_000 });
  bucket.count++;
  buckets.set(req.ip, bucket);
  if (buckets.size > 20_000) buckets.clear();
  if (bucket.count > 60) return res.status(429).json({ error: "rate_limited", message: "Slow down a little and try again in a minute." });
  next();
}

const PRIVATE = { status: 403, body: { error: "private", message: "This server's leaderboard is private." } };
const NOT_FOUND = { status: 404, body: { error: "not_found", message: "There's no leaderboard for that server." } };

// A server's leaderboard: public when leveling is on, unless the server turned it off.
router.get("/api/public/leaderboard/:guildId", rateLimit, wrap(async (req, res) => {
  const { guildId } = req.params;
  if (!SNOWFLAKE.test(guildId)) return res.status(NOT_FOUND.status).json(NOT_FOUND.body);
  const data = await boardCache.wrap(guildId, async () => {
    // Check the database before asking Discord anything, so random ids never reach the
    // Discord API (lots of failed requests there can get the bot rate limited).
    const settings = await ServerSettings.findById(guildId).select("leveling.enable leveling.publicLeaderboard").lean();
    if (!settings) return NOT_FOUND;
    if (!settings.leveling?.enable || settings.leveling.publicLeaderboard === false) return PRIVATE;
    const present = await discord.botGuildIds([guildId]);
    if (!present.has(guildId)) return NOT_FOUND;
    const guild = await discord.getGuild(guildId).catch(() => null);
    if (!guild) return NOT_FOUND;

    const [top, total] = await Promise.all([
      LevelMember.find({ guildId }).sort({ level: -1, xp: -1 }).limit(LEADERBOARD_SIZE).lean(),
      LevelMember.countDocuments({ guildId }),
    ]);
    const users = await Promise.all(top.map((m) => discord.getUser(m.userId)));
    return {
      status: 200,
      body: {
        guild: { id: guild.id, name: guild.name, icon: guild.icon, banner: guild.banner ?? null },
        total,
        members: top.map((m, i) => ({
          rank: i + 1,
          username: users[i]?.username ?? null,
          displayName: users[i]?.global_name || users[i]?.username || "Unknown user",
          avatar: avatarUrl(users[i]),
          level: m.level,
          xp: m.xp,
          needed: xpForLevel(m.level),
        })),
      },
    };
  });
  res.status(data.status).json(data.body);
}));

// A UserDB profile, for /u/<id>. Only people who set up UserDB are shown.
router.get("/api/public/userdb/:id", rateLimit, wrap(async (req, res) => {
  const { id } = req.params;
  if (!SNOWFLAKE.test(id)) return res.status(404).json({ error: "not_found", message: "That isn't a user id." });
  const UserDB = require("../tools/UserDB");
  // UserDB can be turned off in config.json (userdb.global), which exports nothing.
  if (typeof UserDB.findById !== "function") return res.status(404).json({ error: "no_userdb", message: "UserDB isn't available on this bot." });
  // Only look the person up on Discord once we know they have a profile.
  const profile = await UserDB.findById(id).lean().cacheQuery();
  if (!profile) return res.status(404).json({ error: "no_profile", message: "This person hasn't set up UserDB yet." });
  const user = await discord.getUser(id);
  if (!user) return res.status(404).json({ error: "not_found", message: "This user no longer exists on Discord." });
  res.json({
    id,
    username: user.username,
    displayName: user.global_name || user.username,
    avatar: avatarUrl(user, 256),
    banner: user.banner ? `https://cdn.discordapp.com/banners/${id}/${user.banner}.${user.banner.startsWith("a_") ? "gif" : "png"}?size=600` : null,
    accentColor: user.accent_color ?? null,
    timezone: profile.timezone ?? null,
    pronouns: profile.pronouns ?? null,
    description: profile.description ?? null,
    socials: profile.socials ?? {},
    afk: profile.afk?.status ? { reason: profile.afk.status, since: profile.afk.since ?? null } : null,
  });
}));

module.exports = router;
// Exposed for tests only.
module.exports.__test = { boardCache };
