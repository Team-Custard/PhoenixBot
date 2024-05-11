const { Command } = require('@sapphire/framework');
const { BucketScope } = require('@sapphire/framework');
const { PermissionFlagsBits } = require("discord.js");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'guildavatar',
      aliases: ['gav'],
      description: 'Displays a user\'s server avatar. Defaults to normal avatar if none.',
      detailedDescription: {
        usage: 'guildavatar [member]',
        examples: ['avatar 763631377152999435'],
        args: ['member: The member to use.']
      },
      cooldownDelay: 60_000,
      cooldownLimit: 10,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles]
    });
  }

  async messageRun(message, args) {
    let member = await args.pick('member').catch(() => undefined);
    if (!member) member = message.member;
    const avatar = member.avatarURL({ dynamic: true, size: 1024 });

    await message.reply({
      files: [avatar]
    });
  }
}
module.exports = {
  PingCommand
};