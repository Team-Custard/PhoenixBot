const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { Listener } = require("@sapphire/framework");
const { peekSettings } = require("../../tools/guildSettings");
const { buildMessage, contextFrom } = require("../../tools/placeholders");
const { send } = require("../../tools/queue");
const { attachCard } = require("../../tools/greetingCard");

class WelcomerAdd extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "guildMemberAdd", name: "welcomerAdd" });
  }

  async run(member) {
    if (member.user.bot) return;
    const settings = await peekSettings(member.guild.id);
    const welcomer = settings?.welcomer;
    if (!welcomer) return;

    // Text, a saved embed, an image card, or any mix (set on the dashboard's Welcome &
    // goodbye page).
    const card = welcomer.card?.enabled ? welcomer.card : null;
    if (welcomer.channel && (welcomer.message || welcomer.embed || card)) {
      const channel = await member.guild.channels.fetch(welcomer.channel).catch(() => null);
      const ctx = contextFrom({ member, channel });
      let payload = buildMessage(settings, { content: welcomer.message, embed: welcomer.embed }, ctx);
      if (card && channel) payload = await attachCard(payload, { kind: "welcome", guildId: member.guild.id, ctx, card });
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
