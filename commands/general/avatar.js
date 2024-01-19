const { Command } = require('@sapphire/framework');
const { PermissionFlagsBits } = require('discord.js');
const { send } = require('@sapphire/plugin-editable-commands');

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'avatar',
      aliases: ['av'],
      description: 'Sends a user avatar as an attachment.',
      detailedDescription: {
        usage: 'avatar [user]',
        examples: ['avatar sylveondev', 'avatar 763631377152999435'],
        args: ['[user] : The user to find. Defaults to yourself if none found or empty.']
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
      preconditions: ['modonly']
    });
  }

  async messageRun(message, args) {
    const user = await args.pick('user').catch(() => message.author);
    const guildmember = await message.guild.members.fetch(user.id).catch(() => undefined);
    let guildavFound = false;
    if (guildmember) {
        if (guildmember.avatarURL()) guildavFound = true;
    }
    await send(message, { content: `${guildavFound ? `**${user.username}** has a server avatar. Use \`gav\` to view it.` : ``}`, files: [user.avatarURL({ size: 2048, dynamic: true })] });
  }
}
module.exports = {
  PingCommand
};