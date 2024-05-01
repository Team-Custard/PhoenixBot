const { Listener } = require('@sapphire/framework');
const ServerSettings = require('../tools/SettingsSchema');

class GuildCreate extends Listener {
    constructor(context, options) {
        super(context, {
          ...options,
          once: false,
          event: 'guildMemberRemove'
        });
      }
    async run(member) {
      const db = await ServerSettings.findById(member.guild.id).cacheQuery();
      if (db.goodbyes.channel != '') {
        const channel = await member.guild.channels.fetch(db.goodbyes.channel);
        if (channel) channel.send(await require('../tools/textParser').parse(db.goodbyes.message, member));
      }
    }
}
module.exports = {
    GuildCreate
};