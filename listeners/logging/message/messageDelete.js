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
      event: "messageDelete",
    });
  }
  async run(message) {
    if (message.author.bot) return;
    if (!isGuildBasedChannel(message.channel)) return;

    const db = await ServerSettings.findById(message.guild.id).cacheQuery();
    if (db.logging.messages) {
      const channel = await message.guild.channels
        .fetch(db.logging.messages)
        .catch(() => undefined);
      if (channel) {
        const webhook = await webhookFetch.find(channel);
        console.log(webhook);
        if (!webhook) {
          console.log("Welp didn't find a webhook, sry.");
          return;
        }
        const embed = new EmbedBuilder()
          .setAuthor({
            name: message.author.username,
            iconURL: message.author.avatarURL({ dynamic: true, size: 256 }),
          })
          .setDescription(
            `Message deleted in ${channel}\n**Message:**\n${message.content}`,
          )
          .setColor(Colors.Orange)
          .setTimestamp(new Date());

        await webhook
          .send({
            // content: '',
            username: this.container.client.user.username,
            avatarURL: this.container.client.user.avatarURL({
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
