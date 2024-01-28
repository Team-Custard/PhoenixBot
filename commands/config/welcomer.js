const { Command } = require('@sapphire/framework');
const { PermissionFlagsBits, EmbedBuilder, Colors, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { send } = require('@sapphire/plugin-editable-commands');
const { emojis } = require('../../settings.json');
const database = require("../../Tools/SettingsSchema");
const Utils = require('@sapphire/discord.js-utilities');


class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'welcomer',
      aliases: ['welcome', 'greeting'],
      description: 'Configures the welcomer settings.',
      detailedDescription: {
        usage: 'welcomer [option]',
        examples: ['welcomer setup #welcome Welcome to the server', 'welcomer disable'],
        args: ['[option] : The option for the command. Can only be setup, test, disable.']
      },
      cooldownDelay: 10_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
      preconditions: ['modonly'],
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild]
    });
  }

  async messageRun(message, args) {
    const option = await args.pick('string').catch(() => "view");

    switch (option) {
        case 'disable': {
          try {
            const serverdb = await database.findById(message.guild.id).exec();
            serverdb.welcomer.welcomechannel = "";
            serverdb.welcomer.welcometext = "";
            await serverdb.save();
            await send(message, `${emojis.success} Welcomer disabled.`);
          }
          catch (err) {
            console.warn('Database error', err);
            await send(message, { content : `${emojis.error} There was a database error.` });
          }
          break;
        }
        case 'test': {
            try {
              const serverdb = await database.findById(message.guild.id).exec();
              if (serverdb.welcomer.welcomertext == "" || serverdb.welcomer.welcomertext == undefined) return send(message, `${emojis.error} Welcomer isn't setup. Run \`welcomer setup\` to setup.`);
              const welcomertext = serverdb.welcomer.welcometext;
              const welcomerchannel = await message.guild.channels.fetch(serverdb.welcomer.welcomechannel);

              await welcomerchannel.send(`${message.member} : ${welcomertext}`);
              await message.react(emojis.success);
            }
            catch (err) {
              console.warn('Database error', err);
              await send(message, { content : `${emojis.error} There was a database error.` });
            }
            break;
          }
        case 'setup': {
          try {
            const serverdb = await database.findById(message.guild.id).exec();
            const channel = await args.pick('channel');
            const welcometext = await args.rest('string');

            const perms = await channel.permissionsFor(message.guild.members.me, true);
            if (!perms.has(PermissionFlagsBits.SendMessages)) return send(message, `${emojis.error} I don't have permission to send messages in ${channel}.`);
            
            serverdb.welcomer.welcomechannel = channel.id;
            serverdb.welcomer.welcometext = welcometext;
            await serverdb.save();
            await send(message, `${emojis.success} Welcomer setup successfully.`);
          }
          catch (err) {
            console.warn('Database error', err);
            await send(message, { content : `${emojis.error} There was a database error.` });
          }
          break;
        }
        default: {
            const serverdb = await database.findById(message.guild.id).exec();
            const verif = serverdb.welcomer;
            if (verif.channel == "" || verif.channel == undefined) return send(message, `${emojis.error} Welcomer isn't setup. Run \`welcomer setup\` to setup.`);
            const embed = new EmbedBuilder()
            .setAuthor({ iconURL: message.guild.iconURL(), name: `Welcomer settings` })
            .setDescription(`Channel: <#${verif.welcomechannel}>\nText: ${verif.welcometext}`)
            .setColor(Colors.Orange);
            await send(message, { embeds: [embed] });
        }
    }
  }
}
module.exports = {
  PingCommand
};