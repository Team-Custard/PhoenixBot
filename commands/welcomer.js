const { Subcommand } = require('@sapphire/plugin-subcommands');
const { BucketScope } = require('@sapphire/framework');
const serverSettings = require('../tools/SettingsSchema');
const { EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'welcomer',
      subcommands: [
        {
          name: 'test',
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
      builder.setName('welcomer').setDescription('Commands to settings up welcomer')
      .addSubcommand((command) => command.setName('test').setDescription('Tests the welcomer'))
      .addSubcommand((command) => command.setName('setup').setDescription('Configures welcomer settings')
      .addChannelOption(option => option.setName('channel').setDescription('The welcomer channel').setRequired(true))
      .addStringOption(option => option.setName('text').setDescription('The welcomer message to use').setRequired(false)))
      .addSubcommand((command) => command.setName('clear').setDescription('Clears welcomer settings'))
      .setDMPermission(false)
      .setDefaultMemberPermissions(32));
  }

  async chatInputDisplay(interaction) {
    await interaction.deferReply();
    const db = await serverSettings.findById(interaction.guild.id, serverSettings.upsert).cacheQuery();

    if (!db.welcomer.channel) return interaction.followUp(`:x: Welcomer is not setup.`);

    interaction.followUp(`Welcomer messages are being sent to <#${db.welcomer.channel}>\nMessage: ${await require('../tools/textParser').parse(db.welcomer.message, interaction.member)}`);
  }

  async chatInputSet(interaction) {
    await interaction.deferReply();
    const db = await serverSettings.findById(interaction.guild.id, serverSettings.upsert).cacheQuery();

    const channel = await interaction.options.getChannel('channel');
    let messagetext = await interaction.options.getString('text');

    if (!messagetext) messagetext = `Welcome to the server {{mention}}!`;

    db.welcomer.channel = channel.id;
    db.welcomer.message = messagetext;

    db.save()
    .then(() => { interaction.followUp(`:white_check_mark: Successfully setup welcomer.`); })
    .catch((err) => { interaction.followUp(`:x: ${err}`); });
  }

  async chatInputClear(interaction) {
    await interaction.deferReply();
    const db = await serverSettings.findById(interaction.guild.id, serverSettings.upsert).cacheQuery();

    db.welcomer.channel = '';
    db.welcomer.message = '';

    db.save()
    .then(() => { interaction.followUp(`:white_check_mark: Successfully cleared welcomer settings.`); })
    .catch((err) => { interaction.followUp(`:x: ${err}`); });
  }
}
module.exports = {
  PingCommand
};