const { Listener, Identifiers } = require('@sapphire/framework');
const { emojis } = require('../settings.json');

class MessageCommandDenied extends Listener {
    constructor(context, options) {
        super(context, {
          ...options,
          once: false,
          event: 'messageCommandDenied'
        });
      }
    run(error, { message }) {
        switch (error.identifier) {
            case Identifiers.PreconditionUserPermissionsNoPermissions: {
                message.channel.send(`${emojis.error} You are missing permissions to use command.`);
                break;
            }
            case Identifiers.PreconditionNSFW: {
                message.channel.send(`${emojis.error} Command will only work in nsfw channels.`);
                break;
            }
            case Identifiers.PreconditionClientPermissionsNoPermissions: {
                message.channel.send(`${emojis.error} The bot is missing permissions to use command.`);
                break;
            }
            case Identifiers.PreconditionCooldown: {
                message.channel.send(`${emojis.error} Command on cooldown. Try again later.`);
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
  MessageCommandDenied
};