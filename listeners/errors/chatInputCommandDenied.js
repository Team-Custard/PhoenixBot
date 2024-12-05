const { Listener } = require("@sapphire/framework");

class chatInputCommandDenied extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "chatInputCommandDenied",
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
  chatInputCommandDenied,
};
