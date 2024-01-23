const { Command } = require('@sapphire/framework');
const { PermissionFlagsBits, AllowedMentionsTypes } = require('discord.js');
const { send } = require('@sapphire/plugin-editable-commands');

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'echo',
      aliases: ['say', 'repeat'],
      description: 'Repeats what the user says. Due to the possibility of abuse only members with the MANAGE_GUILD permission can use the command.',
      detailedDescription: {
        usage: 'echo <text>',
        examples: ['echo hello world', 'echo mighty fine day we\'re having today'],
        args: ['<text> : The text to repeat']
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      preconditions: ['modonly']
    });
  }

  async messageRun(message, args) {
    const repeat = await args.rest('string');
    await send(message, { content: `${repeat} (Sent by ${message.author})` });
    await message.delete();
  }
}
module.exports = {
  PingCommand
};