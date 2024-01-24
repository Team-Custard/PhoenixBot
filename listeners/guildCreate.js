const { Listener } = require('@sapphire/framework');
const { restricted, whitelisted, emojis } = require('../settings.json');

class GuildCreate extends Listener {
    constructor(context, options) {
        super(context, {
          ...options,
          once: false,
          event: 'guildCreate'
        });
      }
    async run(guild) {
      if (restricted > 0 && (guild.memberCount < restricted && whitelisted.indexOf(guild.id) == -1)) {
        const owner = await guild.fetchOwner();
        await owner.send(`${emojis.error} I'm sorry. Your server **${guild.name}** does not meet the minimum requirements for the Phoenix bot. You need 250 members to be able to use this bot. In most cases you want to consider using other bots. If you really want Phoenix in your server you could also try [self-hosting the bot yourself](https://github.com/SylveonDev/PhoenixBot). Thank you for your interest in Phoenix.`)
        .catch(() => {});
        guild.leave();
      }
    }
}
module.exports = {
    GuildCreate
};