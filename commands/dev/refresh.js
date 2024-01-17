const { Command, CommandStore, ListenerStore, PreconditionStore } = require('@sapphire/framework');
const { PermissionFlagsBits } = require('discord.js');
const { send } = require('@sapphire/plugin-editable-commands');
const { ownerid, emojis } = require('../../settings.json');

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'reload',
      aliases: ['refresh'],
      description: 'Reloads the command store. This command can only be ran by the bot developer only',
      detailedDescription: {
        usage: 'reload',
        examples: ['reload'],
        args: ['No args included.']
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages]
    });
  }

  async messageRun(message) {
    if (message.author.id != ownerid) return send(message, { content: `${emojis.error} Only the bot owner can run the command.` });
    await send(message, 'Refreshing the bot\'s stores.');
    this.container.client.stores.get('listeners').loadAll();
    this.container.client.stores.get('preconditions').loadAll();
    this.container.client.stores.get('commands').loadAll();
  }
}
module.exports = {
  PingCommand
};