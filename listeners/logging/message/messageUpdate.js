const { Listener } = require("@sapphire/framework");
const { peekSettings } = require("../../../tools/guildSettings");
const { sendLog, logEmbed, logChannelId, isIgnoredChannel, truncate } = require("../../../tools/logging");

class LoggerMessageUpdate extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "messageUpdate", name: "loggerMessageUpdate" });
  }

  async run(oldMessage, message) {
    if (!message.guildId) return;
    // Edits that don't change the text (link embeds loading, pins...) aren't logged.
    if (!oldMessage.partial && oldMessage.content === message.content) return;

    // Check the settings before fetching anything: this event fires a lot.
    const guild = message.guild;
    const settings = await peekSettings(message.guildId);
    if (!logChannelId(settings, "messages")) return;
    if (isIgnoredChannel(settings, message.channel)) return;

    if (message.partial) message = await message.fetch().catch(() => null);
    if (!message || message.author.bot) return;
    if (!oldMessage.partial && oldMessage.content === message.content) return;

    const embed = logEmbed(
      message.author,
      `Message updated in ${message.channel}\n[Message jump link](${message.url})${message.stickers.size ? "\n-# Sticker attached below" : ""}`,
    )
      .addFields(
        { name: "Old message:", value: truncate(oldMessage.partial ? "(Not cached)" : oldMessage.content, 1024) || "(None)", inline: true },
        { name: "New message:", value: truncate(message.content, 1024) || "(None)", inline: true },
      )
      .setImage(message.stickers.first()?.url ?? null);

    return sendLog(guild, "messages", { embeds: [embed] }, settings);
  }
}

module.exports = { LoggerMessageUpdate };
