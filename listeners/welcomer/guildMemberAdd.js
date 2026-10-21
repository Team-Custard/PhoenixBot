const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { Listener } = require("@sapphire/framework");
const { peekSettings } = require("../../tools/guildSettings");
const { buildMessage, contextFrom } = require("../../tools/placeholders");
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

    // Text, a saved embed, or both (set on the dashboard's Welcome & goodbye page).
    if (welcomer.channel && (welcomer.message || welcomer.embed)) {
      const channel = await member.guild.channels.fetch(welcomer.channel).catch(() => null);
      const payload = buildMessage(settings, { content: welcomer.message, embed: welcomer.embed }, contextFrom({ member, channel }));
      if (payload) await send(channel, payload);
    }

    if (welcomer.dmtext || welcomer.dmEmbed) {
      const payload = buildMessage(settings, { content: welcomer.dmtext, embed: welcomer.dmEmbed }, contextFrom({ member }));
      if (!payload) return;
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("dmServerInfo")
          .setDisabled(true)
          .setStyle(ButtonStyle.Primary)
          .setLabel(`Sent from: ${member.guild.name}`.slice(0, 80)),
      );
      await member.send({ ...payload, components: [row] }).catch(() => undefined);
    }
  }
}

module.exports = { WelcomerAdd };
