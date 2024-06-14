const { Listener } = require("@sapphire/framework");
const ServerSettings = require("../../tools/SettingsSchema");

class GuildMemberRemove extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "guildMemberRemove",
      name: "welcomerRemove",
    });
  }
  async run(member) {
    if (member.user.bot) return;
    const db = await ServerSettings.findById(member.guild.id).cacheQuery();
    if (!db) return;
    if (db.goodbyes.channel) {
      const channel = await member.guild.channels
        .fetch(db.goodbyes.channel)
        .catch(() => undefined);
      if (channel) {
        channel.send(
          await require("../../tools/textParser").parse(
            db.goodbyes.message,
            member,
          ),
        );
      }
    }
  }
}
module.exports = {
  GuildMemberRemove,
};
