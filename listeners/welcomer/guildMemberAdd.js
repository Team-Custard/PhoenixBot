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
    if (member.user.bot) return;
    const db = await ServerSettings.findById(member.guild.id).cacheQuery();
    if (!db) return;
    if (db.welcomer.channel) {
      const channel = await member.guild.channels
        .fetch(db.welcomer.channel)
        .catch(() => undefined);
      if (channel) {
        channel.send(
          await require("../../tools/textParser").parse(
            db.welcomer.message,
            member,
          ),
        );
      }
    }
  }
}
module.exports = {
  GuildMemberAdd,
};
