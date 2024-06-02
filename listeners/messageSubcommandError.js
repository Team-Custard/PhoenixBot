const { Listener } = require('@sapphire/framework');

class messageSubcommandError extends Listener {
    constructor(context, options) {
        super(context, {
          ...options,
          once: false,
          event: 'messageSubcommandError'
        });
      }
    run(error, { message, command }) {
        console.error(`Error occured while running "${command.name}"`, error);
        message.reply({ content: `:x: ${error}` });
    }
}
module.exports = {
  messageSubcommandError
};