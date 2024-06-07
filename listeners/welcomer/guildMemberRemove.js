const { Listener } = require('@sapphire/framework');
const ServerSettings = require('../../tools/SettingsSchema');

class GuildMemberRemove extends Listener {
    constructor(context, options) {
        super(context, {
          ...options,
          once: false,
          event: 'guildMemberRemove'
        });
      }
    async run(member) {
      if (member.user.bot) return;
      if (this.container.client.id == "1171286616967479377" && member.guild.members.cache.has("1227318291475730443")) return;
      const db = await ServerSettings.findById(member.guild.id).cacheQuery();
      if (db.goodbyes.channel) {
        const channel = await member.guild.channels.fetch(db.goodbyes.channel);
        if (channel) channel.send(await require('../../tools/textParser').parse(db.goodbyes.message, member));
      }
    }
}
module.exports = {
    GuildMemberRemove
};