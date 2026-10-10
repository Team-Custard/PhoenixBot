const { Listener } = require("@sapphire/framework");
const { AuditLogEvent } = require("discord.js");
const { peekSettings } = require("../../../tools/guildSettings");
const { wasOwnDelete } = require("../../../tools/ownDeletes");
const { sendLog, logEmbed, findExecutor, withExecutor, logChannelId, isIgnoredChannel, truncate } = require("../../../tools/logging");

class LoggerMessageDelete extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "messageDelete", name: "loggerMessageDelete" });
  }

  /** @param {import("discord.js").Message} message */
  async run(message) {
    if (!message.guild || wasOwnDelete(message.id)) return;
    const settings = await peekSettings(message.guild.id);
    if (!logChannelId(settings, "messages")) return;
    if (isIgnoredChannel(settings, message.channel)) return;

    // Messages sent before the bot started aren't cached, so there's nothing to show.
    if (message.partial) {
      const embed = logEmbed(null, `A message was deleted in <#${message.channelId}> but I was unable to display info on the message.`);
      return sendLog(message.guild, "messages", { embeds: [embed] }, settings);
    }
    if (message.author?.bot) return;

    const reference = message.reference?.messageId
      ? `\n**Replying to:** ${message.mentions.repliedUser ?? "a message"} - [message jump link](https://discord.com/channels/${message.guildId}/${message.reference.channelId}/${message.reference.messageId})`
      : "";
    const body = `${reference}${message.content ? `\n**Message:**\n${message.content}` : ""}${message.stickers.size ? "\n**Sticker:**" : ""}`;

    const embed = logEmbed(message.author, truncate(`Message deleted in ${message.channel}${body}`, 4096))
      .setImage(message.stickers.first()?.url ?? null);
    const audit = await findExecutor(message.guild, AuditLogEvent.MessageDelete, message.author.id);
    if (audit) {
      withExecutor(embed, audit.executor).setDescription(
        truncate(`${audit.executor} deleted ${message.author}'s message in ${message.channel}${body}`, 4096),
      );
    }

    return sendLog(
      message.guild,
      "messages",
      { embeds: [embed], files: message.attachments.map((a) => ({ attachment: a.url, name: a.name })).slice(0, 10) },
      settings,
    );
  }
}

module.exports = { LoggerMessageDelete };
