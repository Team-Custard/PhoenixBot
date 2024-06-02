const { Listener } = require('@sapphire/framework');
const db = require('../tools/database');

class GuildDelete extends Listener {
    constructor(context, options) {
        super(context, {
          ...options,
          once: false,
          event: 'guildDelete'
        });
      }
    async run(guild) {
      db.cleanupGuildDatabase(guild.id, guild.members);
    }
}
module.exports = {
    GuildDelete
};