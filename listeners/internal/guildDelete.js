const { Listener } = require("@sapphire/framework");
const db = require("../../tools/database");

class GuildDelete extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "guildDelete",
    });
  }
  async run(guild) {
    console.log(`Left guild ${guild.name} (${guild.id})`);
    db.cleanupGuildDatabase(guild.id);
  }
}
module.exports = {
  GuildDelete,
};
