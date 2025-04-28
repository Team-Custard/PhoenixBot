const { Listener } = require("@sapphire/framework");
const { EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class scheduledTaskFinished extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "scheduledTaskFinished",
    });
  }
  async run({ task }) {
    console.log(`Successfully finished task ${task}`);
  }
}
module.exports = {
    scheduledTaskFinished,
};
