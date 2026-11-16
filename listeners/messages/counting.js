const { Listener, Events } = require("@sapphire/framework");
const { peekSettings } = require("../../tools/guildSettings");
const { handleMessage } = require("../../tools/counting");
const { yieldsToStaging } = require("../../tools/staging");

// The counting channel (Counting page on the dashboard; logic in tools/counting.js).
class Counting extends Listener {
  constructor(context, options) {
    super(context, { ...options, name: "counting", event: Events.MessageCreate });
  }

  /** @param {import("discord.js").Message} message */
  async run(message) {
    if (!message.inGuild() || message.author.bot || message.webhookId || message.system) return;
    const settings = await peekSettings(message.guildId);
    if (!settings?.counting?.channel || settings.counting.channel !== message.channelId) return;
    if (await yieldsToStaging(message.guild)) return;
    await handleMessage(message, settings);
  }
}

module.exports = { Counting };
