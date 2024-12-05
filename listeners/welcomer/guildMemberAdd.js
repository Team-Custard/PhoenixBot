const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { Listener } = require("@sapphire/framework");
const ServerSettings = require("../../tools/SettingsSchema");

class GuildMemberAdd extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "guildMemberAdd",
      name: "welcomerAdd",
    });
  }
  async run(member) {
    if (member.partial) member = await member.fetch();
    if (member.user.bot) return;
    const db = await ServerSettings.findById(member.guild.id).cacheQuery();
    if (!db) return;
    if (db.welcomer.channel) {
      const channel = await member.guild.channels
        .fetch(db.welcomer.channel)
        .catch(() => undefined);
      if (channel) {
        channel
          .send(
            await require("../../tools/textParser").parse(
              db.welcomer.message,
              member,
            ),
          )
          .catch(() => undefined);
      }
    }
    if (db.welcomer.dmtext) {
      const actionRow = new ActionRowBuilder()
      .addComponents([
        new ButtonBuilder()
        .setCustomId("dmServerInfo")
        .setDisabled(true)
        .setStyle(ButtonStyle.Primary)
        .setLabel(`Sent from: ${member.guild.name}`),
        /*new ButtonBuilder()
        .setCustomId(`reportServer-${member.guild.id}`)
        .setLabel(`Report abuse`)
        .setStyle(ButtonStyle.Danger)*/
      ])

      member.send({
        content: await require("../../tools/textParser").parse(
          db.welcomer.dmtext,
          member,
        ),
        components: [actionRow]
      }).catch(() => {})
    }
  }
}
module.exports = {
  GuildMemberAdd,
};
