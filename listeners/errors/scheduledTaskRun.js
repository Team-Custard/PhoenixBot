const { Listener } = require("@sapphire/framework");
const { EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class scheduledTaskRun extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "scheduledTaskRun",
    });
  }
  async run(task) {
    console.log(`Running task ${task.name}`);
  }
}
module.exports = {
    scheduledTaskRun,
};
