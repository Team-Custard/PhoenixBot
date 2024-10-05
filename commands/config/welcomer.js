const { Subcommand } = require("@sapphire/plugin-subcommands");
const { BucketScope } = require("@sapphire/framework");
const serverSettings = require("../../tools/SettingsSchema");
const { PermissionFlagsBits } = require("discord.js");

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "welcomer",
      aliases: [],
      description: "Configures welcomer settings.",
      detailedDescription: {
        usage: "welcomer [subcommand] <channel> [text]",
        examples: [
          "welcomer 1199497550143701042 Welcome to the server {{mention}}!",
        ],
        args: [
          "subcommand: ",
          "channel: The channel to use",
          "text: The text to set",
        ],
      },
      subcommands: [
        {
          name: "test",
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
          name: "dm",
          chatInputRun: "chatInputSetDM",
          messageRun: "messageSetDM",
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
        .setName("welcomer")
        .setDescription("Commands to settings up welcomer")
        .addSubcommand((command) =>
          command.setName("test").setDescription("Tests the welcomer"),
        )
        .addSubcommand((command) =>
          command
            .setName("setup")
            .setDescription("Configures welcomer settings")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("The welcomer channel")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("text")
                .setDescription("The welcomer message to use")
                .setRequired(false),
            ),
        )
        .addSubcommand((command) =>
          command
            .setName("dm")
            .setDescription("Configures the welcomer dm settings")
            .addStringOption((option) =>
              option
                .setName("text")
                .setDescription("The welcomer message to use")
                .setRequired(false),
            ),
        )
        .addSubcommand((command) =>
          command.setName("clear").setDescription("Clears welcomer settings"),
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

    if (!db.welcomer.channel) {
      return interaction.followUp(`${this.container.emojis.error} Welcomer is not setup.`);
    }

    interaction.followUp(
      `Welcomer messages are being sent to <#${db.welcomer.channel}>\nMessage: ${await require("../../tools/textParser").parse(db.welcomer.message, interaction.member)}`,
    );
  }

  async chatInputSet(interaction) {
    await interaction.deferReply();
    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();

    const channel = await interaction.options.getChannel("channel");
    let messagetext = await interaction.options.getString("text");

    if (!messagetext) messagetext = `Welcome to the server {{mention}}!`;

    db.welcomer.channel = channel.id;
    db.welcomer.message = messagetext;

    db.save()
      .then(() => {
        interaction.followUp(`${this.container.emojis.success} Successfully setup welcomer.`);
      })
      .catch((err) => {
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      });
  }

  async chatInputSetDM(interaction) {
    await interaction.deferReply();
    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();

    let messagetext = await interaction.options.getString("text");

    if (!messagetext) messagetext = `Welcome to the server {{mention}}!`;

    db.welcomer.dmtext = messagetext;

    db.save()
      .then(() => {
        interaction.followUp(`${this.container.emojis.success} Successfully setup welcomer dm.`);
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

    db.welcomer.channel = "";
    db.welcomer.message = "";

    db.save()
      .then(() => {
        interaction.followUp(
          `${this.container.emojis.success} Successfully cleared welcomer settings.`,
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

    if (!db.welcomer.channel) {
      return message.reply(`${this.container.emojis.error} welcomer is not setup.`);
    }

    message.reply(
      `Welcomer messages are being sent to <#${db.welcomer.channel}>\nMessage: ${await require("../../tools/textParser").parse(db.goodbyes.message, message.member)}`,
    );
  }

  async messageSet(message, args) {
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    const channel = await args.pick("channel");
    let messagetext = await args.rest("string").catch(() => undefined);

    if (!messagetext) messagetext = `Welcome to the **{{servername}}**, {{mention}}!`;

    db.welcomer.channel = channel.id;
    db.welcomer.message = messagetext;

    db.save()
      .then(() => {
        message.reply(`${this.container.emojis.success} Successfully setup welcomer.`);
      })
      .catch((err) => {
        message.reply(`${this.container.emojis.error} ${err}`);
      });
  }

  async messageSetDM(message, args) {
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    let messagetext = await args.rest("string").catch(() => undefined);

    if (!messagetext) messagetext = `Welcome to the **{{servername}}**, {{mention}}!`;

    db.welcomer.dmtext = messagetext;

    db.save()
      .then(() => {
        message.reply(`${this.container.emojis.success} Successfully setup welcomer dm.`);
      })
      .catch((err) => {
        message.reply(`${this.container.emojis.error} ${err}`);
      });
  }

  async messageClear(message) {
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    db.welcomer.channel = "";
    db.welcomer.dmtext = "";
    db.welcomer.message = "";

    db.save()
      .then(() => {
        message.reply(
          `${this.container.emojis.success} Successfully cleared welcomer settings.`,
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
