const { isGuildBasedChannel } = require('@sapphire/discord.js-utilities');
const { container, SapphireClient } = require('@sapphire/framework');
const { GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
const database = require("../tools/SettingsSchema");
const settings = require('../config.json');

class PhoenixClient extends SapphireClient {
    constructor() {
      super({
        caseInsensitiveCommands: true,
        caseInsensitivePrefixes: true,
        defaultPrefix: settings.prefix,
        intents: [GatewayIntentBits.MessageContent, GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages, GatewayIntentBits.GuildMembers],
        loadDefaultErrorListeners: true,
        loadMessageCommandListeners: true
      });
    }

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
    if (message.content == "" || message.content == null || message.content == undefined) return null;
    if (isGuildBasedChannel(message.channel)) {
            // Oh my hot roblox :flushed:
      try {

        let serverdb = await database.findById(message.guild.id).exec();
        if (serverdb === null){
            return this.options.defaultPrefix;
        }
        //console.log(serverdb)
        const prefixes = serverdb.prefix;
        //prefixes.push('');
        return prefixes;
      } catch (err) {
        console.warn('Database error',err);
        return this.options.defaultPrefix;
      }
    }
  };
}
module.exports = {
  PhoenixClient
};