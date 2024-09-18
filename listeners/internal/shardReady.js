const { Listener } = require("@sapphire/framework");
const { ActivityType, Client } = require("discord.js");
const fs = require('fs');

class ReadyListener extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: true,
      event: "shardReady",
    });
  }
  /**
   * 
   * @param {Client} shard 
   * @param {Set} unavailableGuilds
   */
  run(id, unavailableGuilds) {
    if (require("../../config.json").process.botmode == "custom") return;
    
    if (require("../../config.json").process.dashboard == true && id === 0) {
        global.bottype = require("../../config.json").process.botmode;
        require("../../server");
    }

    this.container.logger.info(`Shard ${id} is ready.`)
  }
}
module.exports = {
  ReadyListener,
};
