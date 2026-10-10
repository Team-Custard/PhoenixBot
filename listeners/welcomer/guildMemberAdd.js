const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { Listener } = require("@sapphire/framework");
const { peekSettings } = require("../../tools/guildSettings");
const { parse } = require("../../tools/textParser");
const { render, contextFrom } = require("../../tools/placeholders");
const { send } = require("../../tools/queue");

class WelcomerAdd extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "guildMemberAdd", name: "welcomerAdd" });
  }

  async run(member) {
    if (member.user.bot) return;
    const settings = await peekSettings(member.guild.id);
    const welcomer = settings?.welcomer;
    if (!welcomer) return;

    if (welcomer.channel && welcomer.message) {
      const channel = await member.guild.channels.fetch(welcomer.channel).catch(() => null);
      const content = render(welcomer.message, contextFrom({ member, channel })).slice(0, 2000);
      await send(channel, { content, allowedMentions: { users: [member.id] } });
    }

    if (welcomer.dmtext) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("dmServerInfo")
          .setDisabled(true)
          .setStyle(ButtonStyle.Primary)
          .setLabel(`Sent from: ${member.guild.name}`.slice(0, 80)),
      );
      await member.send({ content: await parse(welcomer.dmtext, member), components: [row] }).catch(() => undefined);
    }
  }
}

module.exports = { WelcomerAdd };
