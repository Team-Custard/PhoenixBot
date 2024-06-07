const { Listener } = require('@sapphire/framework');

class chatInputCommandDenied extends Listener {
    constructor(context, options) {
        super(context, {
          ...options,
          once: false,
          event: 'chatInputCommandDenied'
        });
      }
    run(error, { interaction }) {
            if (interaction.deferred) {
                interaction.followUp({ content: `:x: ${error}`, ephemeral: true });
            }
            else {
                interaction.reply({ content: `:x: ${error}`, ephemeral: true });
            }
    }
}
module.exports = {
  chatInputCommandDenied
};