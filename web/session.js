// Dashboard login sessions.
//
// The old dashboard matched logins by IP address + hostname, so anyone sharing an IP
// (same house, school, VPN, mobile carrier) could end up in someone else's session.
// Sessions are now random tokens in an HttpOnly cookie, stored (hashed) in MongoDB so
// they survive restarts and work across processes.
const crypto = require("crypto");
const { Schema, model } = require("mongoose");
const { dashboard, usesProdCollections } = require("../tools/config");
const discord = require("./discord");

const COOKIE = "phoenix_dash";
const STATE_COOKIE = "phoenix_dash_state";
const SESSION_DAYS = 7;
const GUILD_REFRESH_MS = 60_000;

const sessionSchema = new Schema(
  {
    // sha256 of the cookie value, so a database leak doesn't leak working sessions.
    _id: { type: String, required: true },
    user: {
      id: String,
      username: String,
      globalName: String,
      avatar: String,
    },
    accessToken: String,
    refreshToken: String,
    tokenExpires: Date,
    guilds: [{ _id: false, id: String, name: String, icon: String, owner: Boolean, permissions: String }],
    guildsFetchedAt: Date,
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session = model(usesProdCollections ? "dashboardsessions" : "dashboardsessionsStaging", sessionSchema);

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

function parseCookies(header = "") {
  const cookies = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    if (key) cookies[key] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}

function cookieOptions(maxAgeSeconds) {
  return [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    dashboard.devmode ? null : "Secure",
    `Max-Age=${maxAgeSeconds}`,
  ].filter(Boolean).join("; ");
}

function setCookie(res, name, value, maxAgeSeconds) {
  const existing = res.getHeader("Set-Cookie") ?? [];
  const list = Array.isArray(existing) ? existing : [existing];
  res.setHeader("Set-Cookie", [...list, `${name}=${encodeURIComponent(value)}; ${cookieOptions(maxAgeSeconds)}`]);
}

/** Starts a login: returns the Discord authorize URL and remembers the state value. */
function beginLogin(res, returnTo = "/dash") {
  const state = crypto.randomBytes(16).toString("hex");
  const safeReturn = typeof returnTo === "string" && returnTo.startsWith("/dash") ? returnTo : "/dash";
  setCookie(res, STATE_COOKIE, `${state}|${safeReturn}`, 600);
  return discord.authorizeUrl(state);
}

/** Finishes a login after Discord redirects back. Returns where to send the user. */
async function completeLogin(req, res, code, state) {
  const [expected, returnTo] = (parseCookies(req.headers.cookie)[STATE_COOKIE] ?? "").split("|");
  setCookie(res, STATE_COOKIE, "", 0);
  if (!expected || expected !== state) {
    const error = new Error("Your login link expired or was opened in a different browser. Please try again.");
    error.status = 400;
    throw error;
  }

  const tokens = await discord.exchangeCode(code);
  const [user, guilds] = await Promise.all([
    discord.userRequest(tokens.access_token, "/users/@me"),
    discord.userRequest(tokens.access_token, "/users/@me/guilds"),
  ]);

  const value = crypto.randomBytes(32).toString("hex");
  await Session.create({
    _id: hash(value),
    user: { id: user.id, username: user.username, globalName: user.global_name, avatar: user.avatar },
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpires: new Date(Date.now() + tokens.expires_in * 1000),
    guilds: guilds.map(pickGuild),
    guildsFetchedAt: new Date(),
    expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000),
  });
  setCookie(res, COOKIE, value, SESSION_DAYS * 86_400);
  return returnTo || "/dash";
}

function pickGuild(g) {
  return { id: g.id, name: g.name, icon: g.icon, owner: g.owner, permissions: String(g.permissions) };
}

/** Express middleware: attaches req.session (or null). */
async function loadSession(req, res, next) {
  req.session = null;
  const value = parseCookies(req.headers.cookie)[COOKIE];
  if (value) {
    req.session = await Session.findById(hash(value)).catch(() => null);
    if (req.session && req.session.expiresAt < new Date()) req.session = null;
  }
  next();
}

/** Re-reads the user's server list from Discord when it's more than a minute old. */
async function refreshGuilds(session, { force = false } = {}) {
  const fresh = session.guildsFetchedAt && Date.now() - session.guildsFetchedAt.getTime() < GUILD_REFRESH_MS;
  if (fresh && !force) return session.guilds;

  if (session.tokenExpires && session.tokenExpires.getTime() < Date.now() + 60_000 && session.refreshToken) {
    const tokens = await discord.refreshToken(session.refreshToken);
    session.accessToken = tokens.access_token;
    session.refreshToken = tokens.refresh_token;
    session.tokenExpires = new Date(Date.now() + tokens.expires_in * 1000);
  }
  try {
    const guilds = await discord.userRequest(session.accessToken, "/users/@me/guilds");
    session.guilds = guilds.map(pickGuild);
    session.guildsFetchedAt = new Date();
    session.expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
    await session.save();
  }
  catch (err) {
    // Rate limited: keep using the list we have.
    if (err.status !== 429) throw err;
  }
  return session.guilds;
}

async function logout(req, res) {
  if (req.session) {
    await discord.revokeToken(req.session.accessToken);
    await req.session.deleteOne().catch(() => undefined);
  }
  setCookie(res, COOKIE, "", 0);
}

module.exports = { Session, loadSession, beginLogin, completeLogin, refreshGuilds, logout, parseCookies };
