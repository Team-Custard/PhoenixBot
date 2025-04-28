const { Listener } = require("@sapphire/framework");
const { EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class scheduledTaskStrategyWorkerError extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "scheduledTaskStrategyWorkerError",
    });
  }
  async run(error) {
    console.log(error);
  }
}
module.exports = {
    scheduledTaskStrategyWorkerError,
};
