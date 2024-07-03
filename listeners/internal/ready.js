const { Listener } = require("@sapphire/framework");
const { ActivityType } = require("discord.js");

class ReadyListener extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: true,
      event: "ready",
    });
  }
  run(client) {
    const { username, id } = client.user;
    this.container.logger.info(
      `Bot client successfully started as ${username} (${id})`,
    );
    client.user.setActivity({ name: `${require('../../config.json').process.botmode == 'dev' ? '==' : '='}help || phoenix.sylveondev.xyz 🦊`, type: ActivityType.Custom });
  }
}
module.exports = {
  ReadyListener,
};
