const { Command } = require('@sapphire/framework');
const { PermissionFlagsBits, AttachmentBuilder, Attachment } = require('discord.js');
const { send } = require('@sapphire/plugin-editable-commands');
const bent = require('bent');
const database = require('../../Tools/UserSettingsSchema');
const { emojis } = require('../../settings.json');
const timezones = require('../../Tools/timezones.json');

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'timezone',
      aliases: ['tz', 'settime'],
      description: 'Sets your timezone. Timezone must be set in accordance to [the tz format](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).',
      detailedDescription: {
        usage: 'timezone <timezone>',
        examples: ['timezone America/New_York', 'timezone Asia/Singapore'],
        args: ['No args included.']
      },
      cooldownDelay: 10_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ['modonly']
    });
  }

  async messageRun(message, args) {
    const timezone = await args.pick('string');
    const tzindex = await timezones.indexOf(timezone);
    if (tzindex == -1) return send(message, `${emojis.error} Timezone not found. The timezone is case sensitive so make sure it's correct. Also note the timezone must be set to the tz format for correct formatting. [Click here for the list of tz format timezone](<https://en.wikipedia.org/wiki/List_of_tz_database_time_zones>)`)
    let userdb = await database.findById(message.author.id).exec();
    if (userdb === null) {
        console.log('Initializing database for user ' + message.author.id);
        userdb = await database.create({
            _id: message.author.id,
            pronouns: ['they', 'them'],
            timezone: timezones[tzindex]
        });
        await send(message, { content: `${emojis.success} Timezone set to \`${timezones[tzindex]}\`.` });
    }
    else {
    userdb.timezone = timezones[tzindex];
    userdb.save();
    await send(message, { content: `${emojis.success} Timezone set to \`${timezones[tzindex]}\`.` });
    }
  }
}
module.exports = {
  PingCommand
};