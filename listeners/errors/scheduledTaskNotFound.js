const { Listener } = require("@sapphire/framework");
const { EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class scheduledTaskNotFound extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "scheduledTaskNotFound",
    });
  }
  async run({ task }) {
    console.log(`Task not found: ${task}`);
  }
}
module.exports = {
    scheduledTaskNotFound,
};
