const { ApplicationIntegrationType, InteractionContextType } = require("discord.js");
const { Subcommand } = require("@sapphire/plugin-subcommands");
const { BucketScope, ApplicationCommandRegistry } = require("@sapphire/framework");
const search = require("youtube-search");

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "youtube",
      aliases: ["yt"],
      description: "Searches Youtube for a video or channel.",
      detailedDescription: {
        usage: "youtube [subcommand] <query>",
        examples: [
          "youtube Whistle Flo Rida",
          "youtube How to make a burger HowToBasic",
          "youtube channel SylveonDev",
        ],
        args: [
          "subcommand: Can be video/channel. Defaults to video.",
          "query: The search query to find.",
        ],
      },
      subcommands: [
        {
          name: "video",
          chatInputRun: "chatInputVideo",
          messageRun: "messageVideo",
          default: true,
        },
        {
          name: "channel",
          chatInputRun: "chatInputChannel",
          messageRun: "messageChannel",
        },
      ],
      cooldownDelay: 60_000,
      cooldownLimit: 6,
      cooldownScope: BucketScope.Guild,
      preconditions: ["module"]
    });
  }

  /**
   * @param {ApplicationCommandRegistry} registry 
   */
  registerApplicationCommands(registry) {
    registry.idHints = ["1227016558778519622"];
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("youtube")
        .setDescription("Commands to searching youtube.")
        .addSubcommand((command) =>
          command
            .setName("video")
            .setDescription("Searches YouTube for a video")
            .addStringOption((option) =>
              option
                .setName("query")
                .setDescription("The search query")
                .setRequired(true),
            ),
        )
        .addSubcommand((command) =>
          command
            .setName("channel")
            .setDescription("Searches YouTube for a channel")
            .addStringOption((option) =>
              option
                .setName("query")
                .setDescription("The search query")
                .setRequired(true),
            ),
        )
        .setDMPermission(true)
        .setIntegrationTypes([ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall])
        .setContexts([InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel])
        ,
    );
  }

  async chatInputVideo(interaction) {
    await interaction.deferReply();
    const query = await interaction.options.getString("query");

    const opts = {
      maxResults: 1,
      key: process.env.googlekey,
      type: "video",
    };

    search(query, opts, (err, results) => {
      if (err) return interaction.followUp(`${this.container.emojis.error} Not found.`);
      interaction.followUp(`${results[0].link}`);
    });
  }

  async chatInputChannel(interaction) {
    await interaction.deferReply();
    const query = await interaction.options.getString("query");

    const opts = {
      maxResults: 1,
      key: process.env.googlekey,
      type: "channel",
    };

    search(query, opts, (err, results) => {
      if (err) return interaction.followUp(`${this.container.emojis.error} Not found.`);
      interaction.followUp(`${results[0].link}`);
    });
  }

  async messageVideo(message, args) {
    const query = await args.rest("string");

    const opts = {
      maxResults: 1,
      key: process.env.googlekey,
      type: "video",
    };

    search(query, opts, (err, results) => {
      if (err) return message.reply(`${this.container.emojis.error} Not found.`);
      message.reply(`${results[0].link}`);
    });
  }

  async messageChannel(message, args) {
    const query = await args.rest("string");

    const opts = {
      maxResults: 1,
      key: process.env.googlekey,
      type: "channel",
    };

    search(query, opts, (err, results) => {
      if (err) return message.reply(`${this.container.emojis.error} Not found.`);
      message.reply(`${results[0].link}`);
    });
  }
}
module.exports = {
  PingCommand,
};
