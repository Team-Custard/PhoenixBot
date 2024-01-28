const { Listener } = require('@sapphire/framework');
const database = require('../Tools/SettingsSchema');

class GuildMemberAdd extends Listener {
    constructor(context, options) {
        super(context, {
          ...options,
          once: false,
          event: 'guildMemberAdd'
        });
      }
    async run(member) {
      const serverdb = await database.findById(member.guild.id).exec();
      if (serverdb.welcomer.welcomechannel != undefined) {
            const channel = await member.guild.channels.fetch(serverdb.welcomer.welcomechannel);
            channel.send(`${member} : ${serverdb.welcomer.welcometext}`);
      }
    }
}
module.exports = {
    GuildMemberAdd
};