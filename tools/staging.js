const { container } = require("@sapphire/framework");

// In servers that have both the production bot and the staging bot, the production
// bot stays quiet for passive features (leveling, AFK, automod) so they don't run
// twice. The old check compared `client.id`, which doesn't exist, so it never ran;
// it also did a member fetch (an API call) on every message. Results are now cached.
const PROD_IDS = new Set(["1171286616967479377", "1239263616025493504"]);
const STAGING_ID = "1227318291475730443";
const CACHE_TTL = 60 * 60 * 1000;
const cache = new Map();

/** @param {import("discord.js").Guild} guild */
async function yieldsToStaging(guild) {
  if (!guild || !PROD_IDS.has(container.client.user?.id)) return false;
  const cached = cache.get(guild.id);
  if (cached && cached.expires > Date.now()) return cached.value;

  const value = guild.members.cache.has(STAGING_ID) ||
    Boolean(await guild.members.fetch(STAGING_ID).catch(() => null));
  cache.set(guild.id, { value, expires: Date.now() + CACHE_TTL });
  return value;
}

module.exports = { yieldsToStaging };
