const { Command } = require('@sapphire/framework');
const { PermissionFlagsBits, EmbedBuilder, Colors } = require('discord.js');
const { send } = require('@sapphire/plugin-editable-commands');
const { emojis } = require('../../settings.json');
const database = require("../../Tools/SettingsSchema");


class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'prefix',
      aliases: ['prefixes'],
      description: 'Displays or change the bot prefix.',
      detailedDescription: {
        usage: 'prefix [option] [prefix]',
        examples: ['prefix add !', 'prefix view', 'prefix remove ='],
        args: ['[option] : The option for the command. Can only be add, remove, set, view, or clear.', '[prefix] : The prefix to modify in the server.']
      },
      cooldownDelay: 10_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
      preconditions: ['modonly']
      // requiredUserPermissions: [PermissionFlagsBits.ManageGuild]
    });
  }

  async messageRun(message, args) {
    const option = await args.pick('string').catch(() => "view");

    switch (option) {
        case 'clear': {
          if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return send(message, `${emojis.error} You are missing permissions to use command.`);
          }
          try {
            const serverdb = await database.findById(message.guild.id).exec();
            serverdb.prefix = [];
            serverdb.save();
            await send(message, { content: `${emojis.success} Cleared the server's prefixes. The bot can only be triggered by @mentioning it.` });
          }
          catch (err) {
            console.warn('Database error', err);
            await send(message, { content : `${emojis.error} There was a database error.` });
          }
          break;
        }
        case 'remove': {
          const prefix = await args.pick('string');
          if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return send(message, `${emojis.error} You are missing permissions to use command.`);
          }
          if (prefix == "") {
            await send(message, { content: `${emojis.error} No prefix specified` });
          }
          else {
            try {
              const serverdb = await database.findById(message.guild.id).exec();
              const index = serverdb.prefix.indexOf(prefix);
              if (index > -1) {
                serverdb.prefix.splice(index, 1);
                serverdb.save();
                await send(message, { content: `${emojis.success} Removed **${prefix}** from the prefixes.` });
              }
              else {
                await send(message, { content: `${emojis.error} Prefix specified was not found.` });
              }
            }
            catch (err) {
              console.warn('Database error', err);
              await send(message, { content : `${emojis.error} There was a database error.` });
            }
          }
          break;
        }
        case 'add': {
          const prefix = await args.pick('string');
          if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return send(message, `${emojis.error} You are missing permissions to use command.`);
          }
          if (prefix == "") {
            await send(message, { content: `${emojis.error} No prefix specified` });
          }
          else if (prefix.split("").length >= 6) {
            await send(message, { content: `${emojis.error} The prefix can be no longer than 6 characters.` });
          }
          else {
            try {
              const serverdb = await database.findById(message.guild.id).exec();
              serverdb.prefix.push(prefix);
              serverdb.save();
              await send(message, { content: `${emojis.success} Added **${prefix}** as a prefix.` });
            }
            catch (err) {
              console.warn('Database error', err);
              await send(message, { content : `${emojis.error} There was a database error.` });
            }
          }
          break;
        }
        case 'set': {
          const prefix = await args.pick('string');
          if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return send(message, `${emojis.error} You are missing permissions to use command.`);
          }
            if (prefix == "") {
              await send(message, { content: `${emojis.error} No prefix specified` });
            }
            else if (prefix.split("").length >= 6) {
              await send(message, { content: `${emojis.error} The prefix can be no longer than 6 characters.` });
            }
            else {
              try {
                const serverdb = await database.findById(message.guild.id).exec();
                serverdb.prefix = [prefix];
                serverdb.save();
                await send(message, { content: `${emojis.success} Prefix set to **${prefix}**.` });
              }
              catch (err) {
                console.warn('Database error', err);
                await send(message, { content : `${emojis.error} There was a database error.` });
              }
            }
            break;
        }
        default: {
            const prefixdb = await this.container.client.fetchPrefix(message, true);
            console.log(prefixdb);
            const prefixes = prefixdb.join(', ');
            const embed = new EmbedBuilder()
            .setAuthor({ iconURL: message.guild.iconURL(), name: `${message.guild.name} prefixes` })
            .setDescription('The following are assigned for this server:\n\`' + (prefixes != "" ? prefixes : "None has been set") + '\`\n The set, add, remove subcommands can be used to modify these.')
            .setColor(Colors.Orange);
            await send(message, { embeds: [embed] });
        }
    }
  }
}
module.exports = {
  PingCommand
};