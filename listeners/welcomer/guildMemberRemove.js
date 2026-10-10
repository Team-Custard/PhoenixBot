const { Listener } = require("@sapphire/framework");
const { peekSettings } = require("../../tools/guildSettings");
const { render, contextFrom } = require("../../tools/placeholders");
const { send } = require("../../tools/queue");

class WelcomerRemove extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "guildMemberRemove", name: "welcomerRemove" });
  }

  async run(member) {
    // Members who left can't be fetched anymore, so a partial is all we get.
    if (member.user.bot) return;
    const settings = await peekSettings(member.guild.id);
    const goodbyes = settings?.goodbyes;
    if (!goodbyes?.channel || !goodbyes.message) return;
    const channel = await member.guild.channels.fetch(goodbyes.channel).catch(() => null);
    await send(channel, { content: render(goodbyes.message, contextFrom({ member, channel })).slice(0, 2000), allowedMentions: { parse: [] } });
  }
}

module.exports = { WelcomerRemove };
