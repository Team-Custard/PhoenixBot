const { Listener } = require("@sapphire/framework");
const { peekSettings } = require("../../tools/guildSettings");
const { buildMessage, contextFrom } = require("../../tools/placeholders");
const { send } = require("../../tools/queue");
const { attachCard } = require("../../tools/greetingCard");

class WelcomerRemove extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "guildMemberRemove", name: "welcomerRemove" });
  }

  async run(member) {
    // Members who left can't be fetched anymore, so a partial is all we get.
    if (member.user.bot) return;
    const settings = await peekSettings(member.guild.id);
    const goodbyes = settings?.goodbyes;
    const card = goodbyes?.card?.enabled ? goodbyes.card : null;
    if (!goodbyes?.channel || !(goodbyes.message || goodbyes.embed || card)) return;
    const channel = await member.guild.channels.fetch(goodbyes.channel).catch(() => null);
    if (!channel) return;
    const ctx = contextFrom({ member, channel });
    let payload = buildMessage(settings, { content: goodbyes.message, embed: goodbyes.embed }, ctx);
    if (card) payload = await attachCard(payload, { kind: "goodbye", guildId: member.guild.id, ctx, card });
    // They've left, so mentioning them shouldn't ping.
    if (payload) await send(channel, { ...payload, allowedMentions: { parse: [] } });
  }
}

module.exports = { WelcomerRemove };
