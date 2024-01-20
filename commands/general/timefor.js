const { Command } = require('@sapphire/framework');
const { PermissionFlagsBits, AttachmentBuilder, Attachment } = require('discord.js');
const { send } = require('@sapphire/plugin-editable-commands');
const bent = require('bent');
const database = require('../../Tools/UserSettingsSchema');
const { emojis } = require('../../settings.json');

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'timefor',
      aliases: ['tf', 'time'],
      description: 'The time for specified user. The user must use the `timezone` command before this command can be used.',
      detailedDescription: {
        usage: 'timefor <member>',
        examples: ['timefor sylveondev', 'timefor 763631377152999435'],
        args: ['No args included.']
      },
      cooldownDelay: 10_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ['modonly']
    });
  }

  async messageRun(message, args) {
    const member = await args.pick('member');
    if (member.user.bot) return send(message, `${emojis.error} ${member.user.username} is a bot.`);
    let userdb = await database.findById(member.user.id).exec();
        if (userdb === null) {
            console.log('Initializing database for user ' + member.user.id);
            userdb = await database.create({
                _id: member.user.id,
                pronouns: ['they', 'them']
            });
        }
    if (userdb.timezone == null) return send(message, { content: `${emojis.error} ${member.user.username} has not set a timezone. ${userdb.pronouns[0]} must use \`timezone\` to set a timezone first.` });
    let date = new Date();
    let strTime = date.toLocaleTimeString('en-US', { timeZone: userdb.timezone });
    await send(message, { content: `${member.user.username}'s time is \`${strTime}\`.` });
  }
}
module.exports = {
  PingCommand
};