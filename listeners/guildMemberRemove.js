const { Listener } = require('@sapphire/framework');
const database = require('../Tools/SettingsSchema');

class GuildMemberRemove extends Listener {
    constructor(context, options) {
        super(context, {
          ...options,
          once: true,
          event: 'guildMemberRemove'
        });
      }
    async run(member) {
      const serverdb = await database.findById(member.guild.id).exec();
      if (serverdb.welcomer.goodbyechannel != undefined) {
            const channel = await member.guild.channels.fetch(serverdb.welcomer.goodbyechannel);
            channel.send(`${member} : ${serverdb.welcomer.goodbyetext}`);
      }
    }
}
module.exports = {
    GuildMemberRemove
};