const { isGuildBasedChannel } = require("@sapphire/discord.js-utilities");
const { Listener, Events } = require("@sapphire/framework");
const serverSettings = require("../../tools/SettingsSchema");
const config = require("../../config.json");

class ReadyListener extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      name: "customCommandHandler",
      event: Events.UnknownMessageCommand,
    });
  }
  async run(payload) {
    if (payload.message.author.bot) return;
    if (!isGuildBasedChannel(payload.message.channel)) return;

    const db = await serverSettings
      .findById(payload.message.guild.id, serverSettings.upsert)
      .cacheQuery();

    const cmd = db?.cc.find((t) => t.name == payload.commandName);
    
    const rawArgs = payload.message.content.substr((payload.prefix + payload.commandName).length + 1);

    if (cmd) {
        const args = await this.container.stores.get('commands').get('cc')?.messagePreParse(payload.message, rawArgs, payload);
        require('../../tools/tagsv2').exec(cmd.code, payload.message, args, "cc");
    }
  }
}
module.exports = {
  ReadyListener,
};
