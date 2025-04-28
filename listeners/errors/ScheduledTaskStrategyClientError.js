const { Listener } = require("@sapphire/framework");
const { EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class scheduledTaskStrategyClientError extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "scheduledTaskStrategyClientError",
    });
  }
  async run(error) {
    console.log(error);
  }
}
module.exports = {
    scheduledTaskStrategyClientError,
};
