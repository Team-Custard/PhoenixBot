const { Listener } = require("@sapphire/framework");
const { isGuildBasedChannel } = require("@sapphire/discord.js-utilities");
const ServerSettings = require("../../../tools/SettingsSchema");
const { EmbedBuilder, Colors } = require("discord.js");
const webhookFetch = require("../../../tools/webhookFetch");

class GuildMemberAdd extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "messageUpdate",
    });
  }
  async run(oldmessage, message) {
    if (message.partial) message = await message.fetch();
    if (!isGuildBasedChannel(message.channel)) return;
    if (this.container.client.id == "1239263616025493504") {
      const hasStaging = await message.guild.members
        .fetch("1227318291475730443")
        .catch(() => undefined);
      if (hasStaging) return;
    }

    if (message.author.bot) return;
    if (oldmessage.content == message.content) return;

    const db = await ServerSettings.findById(message.guild.id).cacheQuery();
    if (db.logging.messages) {
      const channel = await message.guild.channels
        .fetch(db.logging.messages)
        .catch(() => undefined);
      if (channel) {
        if (db.logging.msgignorechannels.includes(message.channel.id) || db.logging.msgignorechannels.includes(message.channel.parent?.id)) return;

        const webhook = await webhookFetch.find(channel);

        if (!webhook) {
          console.log("Welp didn't find a webhook, sry.");
          return;
        }
        const embed = new EmbedBuilder()
          .setAuthor({
            name: message.author.username,
            iconURL: message.author.displayAvatarURL({
              dynamic: true,
              size: 256,
            }),
          })
          .setDescription(
            `Message updated in ${message.channel}\n[Message jump link](${message.url})${message.mentions.repliedUser ? `\n**Replying to:** ${message.mentions.repliedUser} - [message jump link](${(await message.fetchReference()).url})` : ``}${message.stickers.first()?.url ? `\n-# Sticker attached below`:``}`,
          )
          .addFields(
            {
              name: `Old message:`,
              value: oldmessage.content ? oldmessage.content : `(None)`,
              inline: true,
            },
            {
              name: `New message:`,
              value: message.content ? message.content : `(None)`,
              inline: true,
            },
          )
          .setColor(Colors.Orange)
          .setImage(message.stickers.first()?.url ?? null)
          .setTimestamp(new Date());

        await webhook
          .send({
            // content: '',
            username: this.container.client.user.username,
            avatarURL: this.container.client.user.displayAvatarURL({
              extension: "png",
              size: 512,
            }),
            embeds: [embed],
            files: message.attachments.map((a) => a.toJSON()),
          })
          .catch((err) =>
            console.error(`[error] Error on sending webhook`, err),
          );
      }
    }
  }
}
module.exports = {
  GuildMemberAdd,
};
