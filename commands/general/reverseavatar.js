const { Command } = require('@sapphire/framework');
const { PermissionFlagsBits } = require('discord.js');
const { send } = require('@sapphire/plugin-editable-commands');

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'reverseavatar',
      aliases: ['rav'],
      description: 'Reverse searches a user\'s avatar.',
      detailedDescription: {
        usage: 'reverseavatar [user]',
        examples: ['reverseavatar sylveondev', 'reverseavatar 763631377152999435'],
        args: ['[user] : The user to find. Defaults to yourself if none found or empty.']
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ['modonly']
    });
  }

  async messageRun(message, args) {
    const user = await args.pick('user').catch(() => message.author);
    await send(message, { content: `Search **${user.username}**'s avatar.\n[\`[Google]\`](<https://lens.google.com/uploadbyurl?url=${user.avatarURL({ size: 2048, dynamic: true })}>) ` +
    `[\`[TinEye]\`](<https://www.tineye.com/search/?&url=${user.avatarURL({ size: 2048, dynamic: true })}>) ` +
    `[\`[Bing]\`](<https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:${user.avatarURL({ size: 2048, dynamic: true })}>)` });
  }
}
module.exports = {
  PingCommand
};