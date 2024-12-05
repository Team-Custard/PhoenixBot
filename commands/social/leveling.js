const { Subcommand } = require("@sapphire/plugin-subcommands");
const { BucketScope, ApplicationCommandRegistry } = require("@sapphire/framework");
const search = require("youtube-search");

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "leveling",
      aliases: ["lvl", 'level'],
      description: "Commands relating to leveling.",
      detailedDescription: {
        usage: "leveling [subcommand] [option]",
        examples: [
          "leveling toggle on",
          "leveling rank",
          "leveling rewards",
        ],
        args: [
          "subcommand: The subcommand. Defaults to rank.",
          "option: The option to the subcommand",
        ],
      },
      subcommands: [
        {
          name: "rank",
          chatInputRun: "chatInputRank",
          messageRun: "messageRank",
          default: true,
        },
        {
            name: "set_level",
            chatInputRun: "chatInputModify",
            messageRun: "messageModify"
        },
        {
          name: "set_multiplier",
          chatInputRun: "chatInputMultiplier",
          messageRun: "messageMultiplier"
        },
      ],
      cooldownDelay: 30_000,
      cooldownLimit: 6,
      cooldownScope: BucketScope.Guild,
      preconditions: ["module"]
    });
  }

  /**
   * 
   * @param {ApplicationCommandRegistry} registry 
   */
  registerApplicationCommands(registry) {
    registry.idHints = ["1227016558778519622"];
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("leveling")
        .setDescription("Leveling related commands")
        .addSubcommand((command) =>
          command
            .setName("rank")
            .setDescription("Displays a member's rank card")
            .addUserOption((option) =>
              option
                .setName("member")
                .setDescription("The member to search")
                .setRequired(false),
            ),
        )
        .addSubcommand((command) =>
          command
            .setName("set_level")
            .setDescription("Sets the member's level")
            .addUserOption((option) =>
              option
                .setName("member")
                .setDescription("The member to set")
                .setRequired(true),
            )
            .addIntegerOption((option) => option.setName("level").setDescription("The level to assign").setRequired(true))
          )
          .addSubcommand((command) =>
            command
              .setName("set_multiplier")
              .setDescription("Sets the main multiplier for everyone.")
              .addNumberOption((option) =>
                option
                  .setName("multiplier")
                  .setDescription("The decimal-based number to set. Minimum 0.1, max 5.0")
                  .setRequired(true),
              )
          )
        .setDMPermission(false),
    );
  }
}
module.exports = {
  PingCommand,
};
