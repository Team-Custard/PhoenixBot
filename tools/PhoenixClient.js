const { isGuildBasedChannel } = require("@sapphire/discord.js-utilities");
const { SapphireClient } = require("@sapphire/framework");
const { GatewayIntentBits, Partials } = require("discord.js");
const database = require("../tools/SettingsSchema");
const settings = require("../config.json");

const { ClusterClient, getInfo } = require('discord-hybrid-sharding');

require('@sapphire/plugin-scheduled-tasks/register');
const redisParse = require('./parseRedisUrl').parse();

class PhoenixClient extends SapphireClient {
  constructor() {
    super({
      shards: getInfo().SHARD_LIST,
      shardCount: getInfo().TOTAL_SHARDS,

      caseInsensitiveCommands: true,
      caseInsensitivePrefixes: true,
      defaultPrefix: settings.prefix,
      intents: [
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
      ],
      loadDefaultErrorListeners: true,
      loadMessageCommandListeners: true,
      typing: true,
      partials: [
        Partials.Message,
        Partials.Reaction
      ],
      tasks: {
        bull: {
          connection: {
            host: redisParse.host,
            password: redisParse.password,
            port: redisParse.port,
            db: 2
          }
        }
      },
      allowedMentions: { parse: ['everyone', 'roles', 'users'], repliedUser: false }
    });
  }

  cluster = new ClusterClient(this);

  async login(token) {
    return super.login(token);
  }

  async destroy() {
    return super.destroy();
  }

  /**
   * Retrieves the prefix for the guild, or if the command used in a guild then default prefix.
   * @param message The message that gives context.
   */
  fetchPrefix = async (message) => {
    // Return if message is blank
    if (
      message.content == "" ||
      message.content == null ||
      message.content == undefined
    )
      return this.options.defaultPrefix;
    if (isGuildBasedChannel(message.channel)) {
      // Oh my hot roblox :flushed:
      try {
        if (settings.process.botmode == "test") return settings.testingprefix;
        const serverdb = await database.findById(message.guild.id).exec();
        if (serverdb === null) {
          return this.options.defaultPrefix;
        }
        const prefixes = serverdb.prefix;
        return prefixes;
      } catch (err) {
        console.warn("Database error", err);
        return this.options.defaultPrefix;
      }
    }

    return this.options.defaultPrefix;
  };
}
module.exports = {
  PhoenixClient,
};
