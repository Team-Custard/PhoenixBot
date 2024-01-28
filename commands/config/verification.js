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
      name: 'verification',
      aliases: ['verificationsettings'],
      description: 'Modifies verification settings.',
      detailedDescription: {
        usage: 'verification [option]',
        examples: ['verification setup #verify @verifiedrole', 'verification disable', 'verification'],
        args: ['[option] : The option for the command. Can only be setup, message, disable.']
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
            serverdb.verification.channel = "";
            serverdb.verification.role = "";
            await serverdb.save();
            await send(message, `${emojis.success} Verification disabled.`);
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
            const verifiedrole = await args.pick('role');

            const perms = await channel.permissionsFor(message.guild.members.me, true);
            if (!perms.has(PermissionFlagsBits.SendMessages)) return send(message, `${emojis.error} I don't have permission to send messages in ${channel}.`);
            if (!perms.has(PermissionFlagsBits.EmbedLinks)) return send(message, `${emojis.error} I don't have permission to embed links in ${channel}.`);

            serverdb.verification.channel = channel.id;
            serverdb.verification.role = verifiedrole.id;
            await serverdb.save();
            await send(message, `${emojis.success} Verification setup successfully.`);
            const verifybutton = new ButtonBuilder()
            .setCustomId('verifyButton')
            .setLabel('Verify')
            .setStyle(ButtonStyle.Primary);
            const messagerow = new ActionRowBuilder()
            .addComponents([verifybutton]);
            const embed = new EmbedBuilder()
            .setAuthor({ iconURL: message.guild.iconURL(), name: `Verification` })
            .setDescription(`This server requires you to complete a verification prompt before you can view any of the channels. You may begin the prompt by clicking the verifiy button below. You must your DMs turned on to recieve the prompt.`)
            .setColor(Colors.Orange);
            await channel.send({ embeds: [embed], components: [messagerow] });
          }
          catch (err) {
            console.warn('Database error', err);
            await send(message, { content : `${emojis.error} There was a database error.` });
          }
          break;
        }
        case 'message': {
          const serverdb = await database.findById(message.guild.id).exec();
          const verif = serverdb.verification;
          if (verif.channel == "" || verif.channel == undefined) return send(message, `${emojis.error} Verification isn't setup. Run \`verification setup\` to setup.`);
          const verifybutton = new ButtonBuilder()
          .setCustomId('verify')
          .setLabel('Verify')
          .setStyle(ButtonStyle.Primary);
          const messagerow = new ActionRowBuilder()
          .addComponents([verifybutton]);
          const embed = new EmbedBuilder()
          .setAuthor({ iconURL: message.guild.iconURL(), name: `Verification` })
          .setDescription(`This server requires you to complete a verification prompt before you can view any of the channels. You may begin the prompt by clicking the verifiy button below. You must your DMs turned on to recieve the prompt.`)
          .setColor(Colors.Orange);
          await send(message, { embeds: [embed], components: [messagerow] });
          break;
        }
        default: {
            const serverdb = await database.findById(message.guild.id).exec();
            const verif = serverdb.verification;
            if (verif.channel == "" || verif.channel == undefined) return send(message, `${emojis.error} Verification isn't setup. Run \`verification setup\` to run the setup prompt.`);
            const embed = new EmbedBuilder()
            .setAuthor({ iconURL: message.guild.iconURL(), name: `Verification settings` })
            .setDescription(`Channel: <#${verif.channel}>\nVerified role: <@&${verif.role}>`)
            .setColor(Colors.Orange);
            await send(message, { embeds: [embed] });
        }
    }
  }
}
module.exports = {
  PingCommand
};