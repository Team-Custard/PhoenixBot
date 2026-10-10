const ServerSettings = require("./SettingsSchema");

/**
 * Loads a server's settings document (through the Redis query cache), creating it
 * with defaults when it doesn't exist yet. The returned document can be modified
 * and saved.
 * @param {string} guildId
 */
async function getSettings(guildId) {
  let doc = await ServerSettings.findById(guildId).cacheQuery();
  if (!doc) {
    await ServerSettings.updateOne(
      { _id: guildId },
      { $setOnInsert: { _id: guildId } },
      { upsert: true, setDefaultsOnInsert: true },
    );
    doc = await ServerSettings.findById(guildId);
  }
  return doc;
}

/**
 * Same as getSettings but returns null instead of creating a document. Use this in
 * hot paths (message listeners) where a missing document just means "not configured".
 * @param {string} guildId
 */
function peekSettings(guildId) {
  return ServerSettings.findById(guildId).cacheQuery();
}

module.exports = { getSettings, peekSettings, ServerSettings };
