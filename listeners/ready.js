const { Listener } = require('@sapphire/framework');
const settings = require('../settings.json');

class Ready extends Listener {
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
      if (settings.replit === true) {
        console.log("Replit setting enabled. Setting up keep alive.");
        require("keep-alive-replit").listen(8080);
      }
    }
}
module.exports = {
  Ready
};