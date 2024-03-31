const { Listener } = require('@sapphire/framework');

class ReadyListener extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: true,
      event: 'ready'
    });
  }
  run(client) {
    const { username, id } = client.user;
    this.container.logger.info(`Successfully logged in as ${username} (${id})`);
    client.user.setActivity({ name: "with gay people" });
  }
}
module.exports = {
  ReadyListener
};