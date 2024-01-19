const { Command } = require('@sapphire/framework');
const { PermissionFlagsBits } = require('discord.js');
const { send } = require('@sapphire/plugin-editable-commands');

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'icon',
      aliases: ['servericon'],
      description: 'Send the server icon as an attachment.',
      detailedDescription: {
        usage: 'icon',
        examples: ['icon'],
        args: ['No args included.']
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
      preconditions: ['modonly']
    });
  }

  async messageRun(message) {
    await send(message, { files: [message.guild.iconURL({ size: 2048, dynamic: true })] });
  }
}
module.exports = {
  PingCommand
};