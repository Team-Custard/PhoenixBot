const { isGuildBasedChannel } = require('@sapphire/discord.js-utilities');
const { container, SapphireClient } = require('@sapphire/framework');
const { GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
const database = require("../Tools/SettingsSchema");
const settings = require('../settings.json');
const { fetch } = require('../Tools/Database');
const { send } = require('@sapphire/plugin-editable-commands');
const { emojis } = require('../settings.json');

class PossumClient extends SapphireClient {
    constructor() {
      super({
        caseInsensitiveCommands: true,
        caseInsensitivePrefixes: true,
        defaultPrefix: settings.prefix,
        intents: [GatewayIntentBits.MessageContent, GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
        //loadDefaultErrorListeners: true,
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
   * @param senderrormsg Sends an error message to the server if enabled.
   */
  fetchPrefix = async (message, senderrormsg) => {
    if (isGuildBasedChannel(message.channel)) {
      // Oh my hot roblox :flushed:
      try {

        let serverdb = await database.findById(message.guild.id).exec();
        if (serverdb === null){
            console.log('Initializing database for guild '+message.guild.id);
            serverdb = await database.create({
                _id: message.guild.id,
                prefix: ["=","ph!"]
            });
        }
        //console.log(serverdb)
        const prefixes = serverdb.prefix;
        //prefixes.push('');
        return prefixes;
      } catch (err) {
        console.warn('Database error',err);
        if (senderrormsg == true) {
            await send(message, { content: `${emojis.error} There was a database error.\n\`\`\`${err}\`\`\`` });
        }
        return this.options.defaultPrefix;
      }
    }
  };
}
module.exports = {
  PossumClient
};