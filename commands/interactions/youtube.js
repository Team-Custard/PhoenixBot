const { Subcommand } = require('@sapphire/plugin-subcommands');
const { BucketScope } = require('@sapphire/framework');
const search = require('youtube-search');

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: 'youtube',
      subcommands: [
        {
          name: 'video',
          chatInputRun: 'chatInputVideo'
        },
        {
          name: 'channel',
          chatInputRun: 'chatInputChannel'
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
      builder.setName('youtube').setDescription('Commands to searching youtube.')
      .addSubcommand((command) => command.setName('video').setDescription('Searches YouTube for a video')
      .addStringOption(option => option.setName('query').setDescription('The search query').setRequired(true)))
      .addSubcommand((command) => command.setName('channel').setDescription('Searches YouTube for a channel')
      .addStringOption(option => option.setName('query').setDescription('The search query').setRequired(true)))
      .setDMPermission(false));
  }

  async chatInputVideo(interaction) {
    await interaction.deferReply();
    const query = await interaction.options.getString('query');

    const opts = {
        maxResults: 1,
        key: process.env.youtubekey,
        type: 'video'
    };

    search(query, opts, function(err, results) {
        if (err) return interaction.followUp(`:x: Not found.`);
        interaction.followUp(`${results[0].link}`);
    });
  }

  async chatInputChannel(interaction) {
    await interaction.deferReply();
    const query = await interaction.options.getString('query');

    const opts = {
        maxResults: 1,
        key: process.env.youtubekey,
        type: 'channel'
    };

    search(query, opts, function(err, results) {
        if (err) return interaction.followUp(`:x: Not found.`);
        interaction.followUp(`${results[0].link}`);
    });
  }
}
module.exports = {
  PingCommand
};