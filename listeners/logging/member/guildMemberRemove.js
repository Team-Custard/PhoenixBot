const { Listener } = require("@sapphire/framework");
const ServerSettings = require("../../../tools/SettingsSchema");
const { EmbedBuilder, Colors } = require("discord.js");
const webhookFetch = require("../../../tools/webhookFetch");

class GuildMemberAdd extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "guildMemberRemove",
      name: "loggerMemberRemove",
    });
  }
  async run(member) {
    const db = await ServerSettings.findById(member.guild.id).cacheQuery();
    if (db.logging.members) {
      const channel = await member.guild.channels
        .fetch(db.logging.members)
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
            name: member.user.username,
            iconURL: member.user.avatarURL({ dynamic: true, size: 256 }),
          })
          .setDescription(
            `${member} left\nMember since <t:${Math.floor(member.joinedTimestamp / 1000)}:R>\nCreated <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
          )
          .setThumbnail(member.user.avatarURL({ dynamic: true, size: 1024 }))
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
