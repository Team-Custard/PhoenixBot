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
    
  }

  async chatInputSet(interaction) {
    
  }

  async chatInputClear(interaction) {
    
  }
}
module.exports = {
  PingCommand
};