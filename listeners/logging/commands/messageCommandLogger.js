const { Listener, Events, Command } = require("@sapphire/framework");
const { isGuildBasedChannel } = require("@sapphire/discord.js-utilities");
const ServerSettings = require("../../../tools/SettingsSchema");
const { EmbedBuilder, Colors, Message } = require("discord.js");
const webhookFetch = require("../../../tools/webhookFetch");

class GuildMemberAdd extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      name: "messageCommandLogger",
      event: Events.MessageCommandFinish,
    });
  }
  /**
   * @param {Message} message
   * @param {Command} command
   */
  async run(message, command) {
    if (!isGuildBasedChannel(message.channel)) return;

    if (message.author?.bot) return;

    const db = await ServerSettings.findById(message.guild.id).cacheQuery();
    if (db.logging.commands) {
      const channel = await message.guild.channels
        .fetch(db.logging.commands)
        .catch(() => undefined);
      if (channel) {
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
            `${message.author} executed the prefix command ${command.name} in ${message.channel}\n**Message:**\n${message.content}`,
          )
          .setImage(message.stickers.first()?.url ?? null)
          .setColor(Colors.Orange)
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
