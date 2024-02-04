const { Command } = require('@sapphire/framework');
const { PermissionFlagsBits, EmbedBuilder, Colors } = require('discord.js');
const { send } = require('@sapphire/plugin-editable-commands');
const { emojis } = require('../../settings.json');
const database = require("../../Tools/SettingsSchema");


class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'banappeal',
      aliases: ['banappeals'],
      description: 'Sets the sets the server\'s ban appeal link.',
      detailedDescription: {
        usage: 'banappeal [link]',
        examples: ['banappeal '],
        args: ['[link] : Sets the ban appeal link, none to clear.']
      },
      cooldownDelay: 10_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      preconditions: ['modonly']
    });
  }

  async messageRun(message, args) {
    const form = await args.pick('string').catch(() => undefined);

    const serverdb = await database.findById(message.guild.id).exec();
    if (form == undefined) {
        if (serverdb.moderation.banAppealLink == undefined || serverdb.moderation.banAppealLink == "") return send(message, `No ban appeal link found. Use \`banappeal [ban appeal link]\` to setup. Note only Google forms links are currently supported.`);
        return send(message, `Ban appeal link is currently:\n<${serverdb.moderation.banAppealLink}>`);
    }
    if (!form.startsWith('https://docs.google.com/forms') && form != 'none') return send(message, `${emojis.error} Invalid link. Note that only google drive links are supported at this time.`);
    if (form == 'none') {serverdb.moderation.banAppealLink = "";}
    else {serverdb.moderation.banAppealLink = form;}
    await serverdb.save();
    await send(message, `${emojis.success} Successfully set the ban appeal link.`);
  }
}
module.exports = {
  PingCommand
};