const { Listener } = require("@sapphire/framework");
const { peekSettings } = require("../../tools/guildSettings");
const { parse } = require("../../tools/textParser");

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
    await channel?.send({ content: await parse(goodbyes.message, member), allowedMentions: { parse: [] } }).catch(() => undefined);
  }
}

module.exports = { WelcomerRemove };
