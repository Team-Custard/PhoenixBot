const { Listener } = require('@sapphire/framework');

class chatInputCommandError extends Listener {
    constructor(context, options) {
        super(context, {
          ...options,
          once: false,
          event: 'chatInputCommandError'
        });
      }
    run(error, { interaction }) {
        console.error(`Error occured while running ${interaction.commandName}`, error);
        if (interaction.deferred || interaction.replied) {
          return interaction.editReply({
            content: `:x: ${error}`
          });
        }

        return interaction.reply({
          content: `:x: ${error}`,
          ephemeral: true
        });
    }
}
module.exports = {
  chatInputCommandError
};