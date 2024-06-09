const { Listener } = require("@sapphire/framework");
const db = require("../../tools/database");

class GuildCreate extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "guildCreate",
    });
  }
  async run(guild) {
    db.initGuildDatabase(guild.id);
  }
}
module.exports = {
  GuildCreate,
};
