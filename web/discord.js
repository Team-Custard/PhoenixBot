// Talking to Discord for the dashboard. Everything goes through REST so the
// dashboard works for every server no matter which cluster it lives on (and in
// dashboard-only mode, where there's no bot client at all).
const { REST, Routes, PermissionFlagsBits } = require("discord.js");
const { token, dashboard, clientSecret } = require("../tools/config");
const { TtlCache } = require("./cache");

const API = "https://discord.com/api/v10";
const rest = new REST({ version: "10" }).setToken(token() ?? "");

const guildCache = new TtlCache(60_000);
const channelCache = new TtlCache(30_000);
const roleCache = new TtlCache(30_000);
const presenceCache = new TtlCache(5 * 60_000, 50_000);
const premiumCache = new TtlCache(5 * 60_000);
const userCache = new TtlCache(60 * 60_000, 20_000);
let applicationId = null;

const redirectUri = () => `${dashboard.baseUrl}/dash/login`;

async function oauthRequest(path, body) {
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error_description || data.error || `Discord OAuth error ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function authorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: dashboard.clientId,
    response_type: "code",
    redirect_uri: redirectUri(),
    scope: "identify guilds",
    state,
    prompt: "none",
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

function exchangeCode(code) {
  return oauthRequest("/oauth2/token", {
    client_id: dashboard.clientId,
    client_secret: clientSecret(),
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
  });
}

function refreshToken(refresh) {
  return oauthRequest("/oauth2/token", {
    client_id: dashboard.clientId,
    client_secret: clientSecret(),
    grant_type: "refresh_token",
    refresh_token: refresh,
  });
}

function revokeToken(accessToken) {
  return oauthRequest("/oauth2/token/revoke", {
    client_id: dashboard.clientId,
    client_secret: clientSecret(),
    token: accessToken,
  }).catch(() => undefined);
}

/** Calls the API as the logged-in user. */
async function userRequest(accessToken, path) {
  const response = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const error = new Error(`Discord API error ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

/** True if the guild entry from /users/@me/guilds lets this user manage the server. */
function canManage(oauthGuild) {
  if (oauthGuild.owner) return true;
  const permissions = BigInt(oauthGuild.permissions ?? 0);
  return (permissions & PermissionFlagsBits.ManageGuild) !== 0n || (permissions & PermissionFlagsBits.Administrator) !== 0n;
}

function getGuild(guildId) {
  return guildCache.wrap(guildId, () => rest.get(Routes.guild(guildId)));
}

function getChannels(guildId) {
  return channelCache.wrap(guildId, () => rest.get(Routes.guildChannels(guildId)));
}

function getRoles(guildId) {
  return roleCache.wrap(guildId, () => rest.get(Routes.guildRoles(guildId)));
}

/** A user's public profile (cached for an hour). */
function getUser(userId) {
  return userCache.wrap(userId, () => rest.get(Routes.user(userId)).catch(() => null));
}

async function getBotMember(guildId) {
  return rest.get(Routes.guildMember(guildId, await getApplicationId()));
}

async function getApplicationId() {
  if (applicationId) return applicationId;
  const app = await rest.get(Routes.currentApplication());
  applicationId = app.id;
  return applicationId;
}

/**
 * Which of these servers the bot is in. Uses the cluster manager when running inside
 * the bot (one cheap message per cluster), otherwise checks each server over REST.
 * @param {string[]} guildIds
 * @returns {Promise<Set<string>>}
 */
async function botGuildIds(guildIds) {
  const { container } = require("@sapphire/framework");
  const cluster = container.client?.cluster;
  if (cluster) {
    try {
      const results = await cluster.broadcastEval(
        (client, ids) => ids.filter((id) => client.guilds.cache.has(id)),
        { context: guildIds, timeout: 5_000 },
      );
      const present = new Set(results.flat());
      for (const id of guildIds) presenceCache.set(id, present.has(id));
      return present;
    }
    catch {
      // Fall through to REST checks.
    }
  }

  const present = new Set();
  const queue = [...guildIds];
  const worker = async () => {
    while (queue.length) {
      const id = queue.shift();
      const known = presenceCache.get(id);
      if (known !== undefined) {
        if (known) present.add(id);
        continue;
      }
      const inGuild = await getGuild(id).then(() => true, () => false);
      presenceCache.set(id, inGuild);
      if (inGuild) present.add(id);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return present;
}

/** Whether a server has Phoenix Plus (or premium is forced on in config.json). */
async function hasPremium(guildId) {
  const config = require("../config.json");
  if (config.forcepremium) return true;
  if (!config.premiumId) return false;
  return premiumCache.wrap(guildId, async () => {
    const appId = await getApplicationId();
    const query = new URLSearchParams({ guild_id: guildId, sku_ids: config.premiumId, exclude_ended: "true" });
    const entitlements = await rest.get(Routes.entitlements(appId), { query }).catch(() => []);
    return entitlements.some((e) => e.guild_id === guildId);
  });
}

function sendMessage(channelId, body) {
  return rest.post(Routes.channelMessages(channelId), { body });
}

/** Forget cached data for a server, e.g. after the bot was added. */
function invalidateGuild(guildId) {
  guildCache.delete(guildId);
  channelCache.delete(guildId);
  roleCache.delete(guildId);
  presenceCache.delete(guildId);
}

// Learn the bot's own application id early, so invite links add the bot whose token
// is in use (the test/staging bot in those modes) instead of the dashboard's OAuth app.
if (token()) getApplicationId().catch(() => undefined);

function inviteUrl(guildId) {
  const permissions = [
    PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks,
    PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AddReactions,
    PermissionFlagsBits.UseExternalEmojis, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageNicknames, PermissionFlagsBits.ManageWebhooks,
    PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers, PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.ViewAuditLog, PermissionFlagsBits.CreateGuildExpressions,
  ].reduce((all, p) => all | p, 0n);
  const params = new URLSearchParams({
    client_id: applicationId ?? dashboard.clientId,
    permissions: permissions.toString(),
    scope: "bot applications.commands",
    integration_type: "0",
  });
  if (guildId) {
    params.set("guild_id", guildId);
    params.set("disable_guild_select", "true");
  }
  return `https://discord.com/oauth2/authorize?${params}`;
}

module.exports = {
  rest,
  authorizeUrl,
  exchangeCode,
  refreshToken,
  revokeToken,
  userRequest,
  canManage,
  getGuild,
  getChannels,
  getRoles,
  getBotMember,
  getUser,
  getApplicationId,
  botGuildIds,
  hasPremium,
  sendMessage,
  invalidateGuild,
  inviteUrl,
};
