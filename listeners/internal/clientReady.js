const { Listener } = require("@sapphire/framework");
const { ActivityType, Client } = require("discord.js");
const fs = require('fs');

class ReadyListener extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: true,
      event: "clientReady",
    });
  }
  /**
   * 
   * @param {Client} client
   */
  run(client) {
    if (require("../../config.json").process.botmode == "custom") {
      // const bots = JSON.parse(
      //   fs.readFileSync(require("../../custombot").list, "utf8"),
      // );

      // const foundToken = bots.find((b) => b.token == client.token);
      // if (!foundToken) {
      // }
      console.log(`[warning] Bot is running in custom mode, which is deprecated and will be removed in future versions.`);
    }
    else {
      const { username, id } = client.user;
      this.container.logger.info(
        `Bot client successfully started as ${username} (${id})`,
      );
      client.user.setActivity({
        name: `${require("../../config.json").process.botmode == "dev" ? "==" : require("../../config.json").process.botmode == "test" ? "===" : "="}help || phoenix.sylveondev.xyz 🦊`,
        type: ActivityType.Custom,
      });
    }
  }
}
module.exports = {
  ReadyListener,
};