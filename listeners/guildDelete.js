const { Listener } = require('@sapphire/framework');
const database = require('../tools/SettingsSchema');

class GuildDelete extends Listener {
    constructor(context, options) {
        super(context, {
          ...options,
          once: false,
          event: 'guildDelete'
        });
      }
    async run(guild) {
      await database.findByIdAndDelete(guild.id).exec()
      .then(() => console.log(`Deleted database for ${guild.id}`))
      .catch((err) => console.error(`Error deleting database for ${guild.id}`, err));
    }
}
module.exports = {
    GuildDelete
};