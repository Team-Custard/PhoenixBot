const { Listener } = require("@sapphire/framework");

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
    client.user.setActivity({ name: "/help || phoenixbot.epicgamer.org" });
  }
}
module.exports = {
  ReadyListener,
};
