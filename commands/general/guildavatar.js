const { Command } = require('@sapphire/framework');
const { PermissionFlagsBits } = require('discord.js');
const { send } = require('@sapphire/plugin-editable-commands');
const { emojis } = require('../../settings.json');

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'guildavatar',
      aliases: ['gav'],
      description: 'Sends a user\'s server avatar as an attachment if possible.',
      detailedDescription: {
        usage: 'guildavatar [member]',
        examples: ['guildavatar sylveondev', 'avatar 763631377152999435'],
        args: ['[member] : The member to find. Defaults to yourself if none found or empty.']
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
      preconditions: ['modonly']
    });
  }

  async messageRun(message, args) {
    const member = await args.pick('member').catch(() => message.member);
    if (!member.avatarURL()) return send(message, { content: `${emojis.error} No guild avatar found for ${member.user.username}.` });
    await send(message, { files: [member.avatarURL({ size: 2048, dynamic: true })] });
  }
}
module.exports = {
  PingCommand
};