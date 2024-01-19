const { Command, CommandStore, ListenerStore, PreconditionStore } = require('@sapphire/framework');
const { PermissionFlagsBits } = require('discord.js');
const { send } = require('@sapphire/plugin-editable-commands');
const { ownerid, emojis } = require('../../settings.json');

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'shutdown',
      aliases: ['kys','logoff','poweroff'],
      description: 'Turns the bot off. This command can only be ran by the bot developer only',
      detailedDescription: {
        usage: 'shutdown',
        examples: ['shutdown'],
        args: ['No args included.']
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ['owneronly']
    });
  }

  async messageRun(message) {
    await send(message, 'Goodbye.');
    this.container.logger.info('Shutdown request recieved. Shutting the bot down.');
    await require('../../Tools/Database').disconnect();
    await this.container.client.destroy();
    process.exit();
  }
}
module.exports = {
  PingCommand
};