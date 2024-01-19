const { Command } = require('@sapphire/framework');
const { PermissionFlagsBits, EmbedBuilder, Colors } = require('discord.js');
const { send } = require('@sapphire/plugin-editable-commands');
const { emojis } = require('../../settings.json');
const database = require("../../Tools/SettingsSchema");


class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'modonly',
      aliases: ['onlymod'],
      description: 'Toggles modonly. This settings locks the bot to moderators only.',
      detailedDescription: {
        usage: 'modonly [enable]',
        examples: ['modonly true', 'modonly false'],
        args: ['[enable] : Enable the command. Must be true or false.']
      },
      cooldownDelay: 10_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      preconditions: ['modonly']
    });
  }

  async messageRun(message, args) {
    const option = await args.pick('string').catch(() => "view");

    switch (option) {
        case 'true': {
          try {
            const serverdb = await database.findById(message.guild.id).exec();
            serverdb.modonly = true;
            serverdb.save();
            await send(message, { content: `${emojis.success} Modonly has been enabled.` });
          }
          catch (err) {
            console.warn('Database error', err);
            await send(message, { content : `${emojis.error} There was a database error.` });
          }
          break;
        }
        case 'false': {
            try {
              const serverdb = await database.findById(message.guild.id).exec();
              serverdb.modonly = false;
              serverdb.save();
              await send(message, { content: `${emojis.success} Modonly has been disabled.` });
            }
            catch (err) {
              console.warn('Database error', err);
              await send(message, { content : `${emojis.error} There was a database error.` });
            }
            break;
          }
        default: {
            const serverdb = await database.findById(message.guild.id).exec();
            const enabled = serverdb.modonly;
            await send(message, { content: `Modonly is currently ${enabled == true ? `**enabled**.` : `**disabled**.`} Modonly is a setting that limits the bot access to mods only.` });
        }
    }
  }
}
module.exports = {
  PingCommand
};