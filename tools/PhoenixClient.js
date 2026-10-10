const { SapphireClient, ApplicationCommandRegistries, RegisterBehavior } = require("@sapphire/framework");
const { GatewayIntentBits, Partials } = require("discord.js");
const { ClusterClient, getInfo } = require("discord-hybrid-sharding");
const ServerSettings = require("./SettingsSchema");
const { settings, defaultPrefix } = require("./config");

// Replace the whole set of global slash commands with exactly what the code defines.
// This removes commands that no longer exist (the old config commands like /welcomer)
// instead of leaving them in Discord's menu, and is a single API call.
ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite);

require("@sapphire/plugin-hmr/register");
require("@sapphire/plugin-scheduled-tasks/register");

class PhoenixClient extends SapphireClient {
  constructor() {
    const redis = require("./parseRedisUrl").parse();
    super({
      shards: getInfo().SHARD_LIST,
      shardCount: getInfo().TOTAL_SHARDS,

      caseInsensitiveCommands: true,
      caseInsensitivePrefixes: true,
      // "=" in prod, "==" in dev and "===" in test, so the bots don't answer each other's commands.
      defaultPrefix,
      intents: [
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        // Lets the logging webhook cache know when a channel's webhooks change.
        GatewayIntentBits.GuildWebhooks,
        // Discord AutoMod rule breaks, for the punishments linked on the dashboard.
        GatewayIntentBits.AutoModerationExecution,
      ],
      loadDefaultErrorListeners: true,
      loadMessageCommandListeners: true,
      typing: true,
      partials: [Partials.Message, Partials.Reaction],
      tasks: {
        bull: {
          connection: {
            host: redis.host,
            port: redis.port,
            username: redis.username,
            password: redis.password,
            db: process.env["bullmq"] ? Number(process.env["bullmq"]) : undefined,
          },
        },
      },
      hmr: {
        enabled: settings.enableHmr,
      },
      allowedMentions: { parse: ["everyone", "roles", "users"], repliedUser: false },
    });
    this.cluster = new ClusterClient(this);
    // discord.js waits out normal per-route limits by itself; a global limit means
    // the whole bot is sending too much, which is worth knowing about.
    this.rest.on("rateLimited", (info) => {
      if (info.global) console.warn(`[rest] Hit Discord's global rate limit (${info.method} ${info.route}, waiting ${info.timeToReset}ms). Queue backlog: ${require("./queue").queue.size}`);
    });
  }

  /**
   * Retrieves the prefix for the guild, or the default prefix outside of guilds.
   * Returning null disables prefix commands (servers can turn them off on the dashboard).
   * @param {import("discord.js").Message} message
   */
  fetchPrefix = async (message) => {
    if (!message.content) return this.options.defaultPrefix;
    if (!message.inGuild()) return this.options.defaultPrefix;
    // Test mode used to return the testing prefix here before reading the server's
    // settings, so the dashboard's prefix and on/off switch did nothing for it.

    try {
      // Runs for every message, so only read the two fields we need, through the cache.
      const serverdb = await ServerSettings.findById(message.guildId).select("prefix enablePrefix").lean().cacheQuery();
      if (!serverdb) return this.options.defaultPrefix;
      if (serverdb.enablePrefix === false) return null;
      return serverdb.prefix || this.options.defaultPrefix;
    }
    catch (err) {
      console.warn("Database error", err);
      return this.options.defaultPrefix;
    }
  };
}

module.exports = {
  PhoenixClient,
};
