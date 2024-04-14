const { Subcommand } = require('@sapphire/plugin-subcommands');
const { BucketScope } = require('@sapphire/framework');
const serverSettings = require('../tools/SettingsSchema');
const { EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'verification',
      subcommands: [
        {
          name: 'display',
          chatInputRun: 'chatInputDisplay'
        },
        {
          name: 'setup',
          chatInputRun: 'chatInputSet'
        },
        {
          name: 'clear',
          chatInputRun: 'chatInputClear'
        }
      ],
      cooldownDelay: 60_000,
      cooldownLimit: 6,
      cooldownScope: BucketScope.Guild
    });
  }

  registerApplicationCommands(registry) {
    registry.idHints = ['1227016558778519622'];
    registry.registerChatInputCommand((builder) =>
      builder.setName('verification').setDescription('Commands to settings up verification')
      .addSubcommand((command) => command.setName('display').setDescription('Displays the verification message'))
      .addSubcommand((command) => command.setName('setup').setDescription('Configures verification settings')
      .addRoleOption(option => option.setName('verified_role').setDescription('The verified role').setRequired(true))
      .addStringOption(option => option.setName('message_text').setDescription('The verification message to use').setRequired(false))
      .addStringOption(option => option.setName('verified_text').setDescription('The message to use after verification').setRequired(false)))
      .addSubcommand((command) => command.setName('clear').setDescription('Clears verification settings'))
      .setDMPermission(false)
      .setDefaultMemberPermissions(32));
  }

  async chatInputDisplay(interaction) {
    await interaction.deferReply();
    const db = await serverSettings.findById(interaction.guild.id, serverSettings.upsert).exec();

    const embed = new EmbedBuilder()
    .setAuthor({ name: interaction.guild.name + ' Verification', iconURL: interaction.guild.iconURL({ dynamic: true }) })
    .setDescription(db.verification.messageText ? db.verification.messageText : 'This server uses PhoenixBot for verification. To verify, click the verification button below.')
    .setTimestamp(new Date())
    .setColor(Colors.Orange);

    const button = new ActionRowBuilder()
    .addComponents(new ButtonBuilder()
    .setCustomId('verify')
    .setLabel('Verify')
    .setStyle(ButtonStyle.Primary));

    interaction.followUp({ embeds: [embed], components: [button] });
  }

  async chatInputSet(interaction) {
    await interaction.deferReply();
    const db = await serverSettings.findById(interaction.guild.id, serverSettings.upsert).exec();

    const role = await interaction.options.getRole('verified_role');
    const messagetext = await interaction.options.getString('message_text', false);
    const verifiedtext = await interaction.options.getString('verified_text', false);

    db.verification.role = role.id;
    (messagetext ? db.verification.messageText = messagetext : null);
    (verifiedtext ? db.verification.verifiedText = verifiedtext : null);

    db.save()
    .then(() => { interaction.followUp(`:white_check_mark: Successfully setup verification.`); })
    .catch((err) => { interaction.followUp(`:x: ${err}`); });
  }

  async chatInputClear(interaction) {
    await interaction.deferReply();
    const db = await serverSettings.findById(interaction.guild.id, serverSettings.upsert).exec();

    db.verification.role = '';
    db.verification.messageText = '';
    db.verification.verifiedText = '';

    db.save()
    .then(() => { interaction.followUp(`:white_check_mark: Successfully cleared verification settings.`); })
    .catch((err) => { interaction.followUp(`:x: ${err}`); });
  }
}
module.exports = {
  PingCommand
};