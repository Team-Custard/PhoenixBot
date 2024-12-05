const { Listener } = require("@sapphire/framework");
const { ActivityType, EmbedBuilder, Colors } = require("discord.js");
const database = require("../../tools/database");

class ReadyListener extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: true,
      emitter: process,
      event: "SIGINT",
    });
  }
  async run() {
    console.log(`Requested bot shutdown`);
    await database.disconnect();
    await this.container.client.destroy().catch(() => console.log(`Error shutting down the bot.`));
    console.log(`Shutdown tasks succeeded.`);
    process.exit(0);
  }
}
module.exports = {
  ReadyListener,
};