const { Listener, Identifiers } = require('@sapphire/framework');
const { emojis } = require('../settings.json')

class MessageCommandError extends Listener {
    constructor(context, options) {
        super(context, {
          ...options,
          once: false,
          event: 'messageCommandError'
        });
      }
    run(error, { message }) {
        switch (error.identifier) {
            case Identifiers.ArgsMissing: {
                message.channel.send(`${emojis.error} Command is missing arguments.`);
                break;
            }
            default: {
                console.error(error);
                return message.channel.send(`\`\`\`${error.message}\`\`\``);
            }
        }
        
    }
}
module.exports = {
  MessageCommandError
};