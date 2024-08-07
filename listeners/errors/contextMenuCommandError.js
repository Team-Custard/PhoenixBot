const { Listener } = require("@sapphire/framework");

class contextMenuCommandError extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "contextMenuCommandError",
    });
  }
  run(error, { interaction }) {
    if (interaction.deferred || interaction.replied) {
      return interaction.editReply({
        content: `${this.container.emojis.error} ${error}`,
      });
    }
    return interaction.reply({
      content: `${this.container.emojis.error} ${error}`,
      ephemeral: true,
    });
  }
}
module.exports = {
  contextMenuCommandError,
};
