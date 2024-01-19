const { Command } = require('@sapphire/framework');
const { PermissionFlagsBits } = require('discord.js');
const { send } = require('@sapphire/plugin-editable-commands');
const { emojis } = require('../../settings.json');

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'invite',
      aliases: ['inv'],
      description: 'Generates an invite link for a bot.',
      detailedDescription: {
        usage: 'invite <bot> [permission]',
        examples: ['invite Carl-bot 8', 'invite 235148962103951360 -9'],
        args: ['<bot> : The bot to invite. Note that old bots made before mid-2016 won\'t work.', '[permission] : The permission number to add to the invite. Defaults to 0.']
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ['modonly']
    });
  }

  async messageRun(message, args) {
    const mentionedbot = await args.pick('member');
    if (mentionedbot.bot) return send(message, { content: `${emojis.error} Not a bot.` });
    const permissions = await args.pick('number').catch(() => '0');
    await send(message, { content: `Generated link for **${mentionedbot.user.username}**:\nhttps://discord.com/oauth2/authorize?&client_id=${mentionedbot.id}&scope=applications.commands+bot&permissions=${permissions}` });
  }
}
module.exports = {
  PingCommand
};