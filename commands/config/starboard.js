const { Subcommand } = require("@sapphire/plugin-subcommands");
const { BucketScope } = require("@sapphire/framework");
const serverSettings = require("../../tools/SettingsSchema");
const { PermissionFlagsBits } = require("discord.js");

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "starboard",
      aliases: [],
      description: "Configures the starboard.",
      detailedDescription: {
        usage: "starboard [subcommand] <channel> [threshold] [emoji]",
        examples: ["starboard set #starboard 3 ⭐"],
        args: [
          "subcommand: Setup/clear/info",
          "channel: The channel to use",
          "threshold: How much stars before being added",
          "text: The text to set",
        ],
      },
      subcommands: [
        {
          name: "info",
          chatInputRun: "chatInputDisplay",
          messageRun: "messageDisplay",
          default: true,
        },
        {
          name: "setup",
          chatInputRun: "chatInputSet",
          messageRun: "messageSet",
        },
        {
          name: "clear",
          chatInputRun: "chatInputClear",
          messageRun: "messageClear",
        },
      ],
      cooldownDelay: 60_000,
      cooldownLimit: 6,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
    });
  }

  registerApplicationCommands(registry) {
    registry.idHints = ["1227016558778519622"];
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("starboard")
        .setDescription("Commands to configure the starboard")
        .addSubcommand((command) =>
          command.setName("info").setDescription("Displays starboard settings"),
        )
        .addSubcommand((command) =>
          command
            .setName("setup")
            .setDescription("Configures starboard settings")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("The starboard channel")
                .setRequired(true),
            )
            .addNumberOption((option) =>
              option
                .setName("threshold")
                .setDescription(
                  "The threshold to add the starboard to the channel",
                )
                .setRequired(false),
            )
            .addStringOption((option) =>
              option
                .setName("emoji")
                .setDescription("A custom starboard emoji if wanted")
                .setRequired(false),
            )
            .addBooleanOption((option) =>
              option
                .setName("selfstar")
                .setDescription(
                  "Allow self-starring. If disabled, users can't star their own posts.",
                )
                .setRequired(false),
            ),
        )
        .addSubcommand((command) =>
          command.setName("clear").setDescription("Clears starboard settings"),
        )
        .setDMPermission(false)
        .setDefaultMemberPermissions(32),
    );
  }

  async chatInputDisplay(interaction) {
    await interaction.deferReply();
    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();

    if (!db.starboard.channel) {
      return interaction.followUp(`${this.container.emojis.error} Starboard is not setup.`);
    }

    interaction.followUp(
      `The server's starboard is being sent to <#${db.starboard.channel}>. ${db.starboard.threshold} ${db.starboard.emoji} reactions are needed to get on the starboard, and self-starring is ${db.starboard.selfstar ? `allowed` : `not allowed`}.`,
    );
  }

  async chatInputSet(interaction) {
    await interaction.deferReply();
    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();

    const channel = await interaction.options.getChannel("channel");
    let threshold = await interaction.options.getNumber("threshold");
    let baseemoji = await interaction.options.getString("emoji");
    const selfstar = await interaction.options.getBoolean("selfstar");

    if (!threshold) threshold = 2;
    else threshold = Math.round(threshold); // Round the number to the nearest int in case someone specifies a decimal
    if (!baseemoji) baseemoji = "⭐";

    const unicodeemoji = baseemoji.match(
      /\p{Extended_Pictographic}/gu
    );
    const customemoji = baseemoji.match(
      /<:.+?:\d+>/gu,
    );
    const emojis = new Array().concat(unicodeemoji, customemoji).filter(item => item);
    if (emojis.length == 0)
      return interaction.followUp(`${this.container.emojis.error} Invalid emoji specified.`);

    db.starboard.channel = channel.id;
    db.starboard.threshold = threshold;
    db.starboard.emoji = emojis[0];
    db.starboard.selfstar = selfstar;

    db.save()
      .then(() => {
        interaction.followUp(
          `${this.container.emojis.success} Successfully setup starboard.`,
        );
      })
      .catch((err) => {
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      });
  }

  async chatInputClear(interaction) {
    await interaction.deferReply();
    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();

    db.starboard.channel = "";
    db.starboard.threshold = 0;
    db.starboard.emoji = "";
    db.starboard.selfstar = false;

    db.save()
      .then(() => {
        interaction.followUp(
          `${this.container.emojis.success} Successfully cleared starboard settings.`,
        );
      })
      .catch((err) => {
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      });
  }

  async messageDisplay(message) {
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    if (!db.starboard.channel) {
      return message.reply(`${this.container.emojis.error} Starboard is not setup.`);
    }

    message.reply(
      `The server's starboard is being sent to <#${db.starboard.channel}>. ${db.starboard.threshold} ${db.starboard.emoji} reactions are needed to get on the starboard, and self-starring is ${db.starboard.selfstar ? `allowed` : `not allowed`}.`,
    );
  }

  async messageSet(message, args) {
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    const channel = await args.pick("channel");
    let threshold = await args.pick("number").catch(() => 2);
    const selfstar = await args.pick("boolean").catch(() => false);
    let baseemoji = await args.pick("string").catch(() => "⭐");

    threshold = Math.round(threshold); // Round the number to the nearest int in case someone specifies a decimal
    console.log(
      `Matched emoji: ${baseemoji} - ${baseemoji.match(/<a?:.+?:\d+>|\p{Extended_Pictographic}/gu)}`,
    );
    const emojis = baseemoji.match(/<a?:.+?:\d+>|\p{Extended_Pictographic}/gu);
    if (!emojis) return message.reply(`${this.container.emojis.error} Invalid emoji specified.`);
    if (emojis.length == 0)
      return message.reply(`${this.container.emojis.error} Invalid emoji specified.`);

    db.starboard.channel = channel.id;
    db.starboard.threshold = threshold;
    db.starboard.emoji = emojis[0];
    db.starboard.selfstar = selfstar;

    db.save()
      .then(() => {
        message.reply(`${this.container.emojis.success} Successfully setup starboard.`);
      })
      .catch((err) => {
        message.reply(`${this.container.emojis.error} ${err}`);
      });
  }

  async messageClear(message) {
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    db.starboard.channel = "";
    db.starboard.threshold = 0;
    db.starboard.emoji = "";
    db.starboard.selfstar = false;

    db.save()
      .then(() => {
        message.reply(
          `${this.container.emojis.success} Successfully cleared starboard settings.`,
        );
      })
      .catch((err) => {
        message.reply(`${this.container.emojis.error} ${err}`);
      });
  }
}
module.exports = {
  PingCommand,
};
