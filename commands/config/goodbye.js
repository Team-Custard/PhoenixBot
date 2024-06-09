const { Subcommand } = require("@sapphire/plugin-subcommands");
const { BucketScope } = require("@sapphire/framework");
const serverSettings = require("../../tools/SettingsSchema");
const { PermissionFlagsBits } = require("discord.js");

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "goodbye",
      aliases: [],
      description: "Configures goodbyes settings.",
      detailedDescription: {
        usage: "goodbyes [subcommand] <channel> [text]",
        examples: [
          "goodbyes 1199497550143701042 {{username}} has left the server",
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
        .setName("goodbye")
        .setDescription("Commands to settings up goodbyes")
        .addSubcommand((command) =>
          command.setName("test").setDescription("Tests the goodbye"),
        )
        .addSubcommand((command) =>
          command
            .setName("setup")
            .setDescription("Configures goodbye settings")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("The goodbye channel")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("text")
                .setDescription("The goodbye message to use")
                .setRequired(false),
            ),
        )
        .addSubcommand((command) =>
          command.setName("clear").setDescription("Clears goodbye settings"),
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

    if (!db.goodbyes.channel)
      return interaction.followUp(`:x: Goodbyes is not setup.`);

    interaction.followUp(
      `Goodbye messages are being sent to <#${db.goodbyes.channel}>\nMessage: ${await require("../../tools/textParser").parse(db.goodbyes.message, interaction.member)}`,
    );
  }

  async chatInputSet(interaction) {
    await interaction.deferReply();
    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();

    const channel = await interaction.options.getChannel("channel");
    let messagetext = await interaction.options.getString("text");

    if (!messagetext) messagetext = `{{username}} has left the server.`;

    db.goodbyes.channel = channel.id;
    db.goodbyes.message = messagetext;

    db.save()
      .then(() => {
        interaction.followUp(`:white_check_mark: Successfully setup goodbye.`);
      })
      .catch((err) => {
        interaction.followUp(`:x: ${err}`);
      });
  }

  async chatInputClear(interaction) {
    await interaction.deferReply();
    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();

    db.goodbyes.channel = "";
    db.goodbyes.message = "";

    db.save()
      .then(() => {
        interaction.followUp(
          `:white_check_mark: Successfully cleared goodbye settings.`,
        );
      })
      .catch((err) => {
        interaction.followUp(`:x: ${err}`);
      });
  }

  async messageDisplay(message) {
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    if (!db.goodbyes.channel)
      return message.reply(`:x: Goodbyes is not setup.`);

    message.reply(
      `Goodbye messages are being sent to <#${db.goodbyes.channel}>\nMessage: ${await require("../../tools/textParser").parse(db.goodbyes.message, message.member)}`,
    );
  }

  async messageSet(message, args) {
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    const channel = await args.pick("channel");
    let messagetext = await args.rest("string").catch(() => undefined);

    if (!messagetext) messagetext = `{{username}} has left the server.`;

    db.goodbyes.channel = channel.id;
    db.goodbyes.message = messagetext;

    db.save()
      .then(() => {
        message.reply(`:white_check_mark: Successfully setup goodbye.`);
      })
      .catch((err) => {
        message.reply(`:x: ${err}`);
      });
  }

  async messageClear(message) {
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    db.goodbyes.channel = "";
    db.goodbyes.message = "";

    db.save()
      .then(() => {
        message.reply(
          `:white_check_mark: Successfully cleared goodbye settings.`,
        );
      })
      .catch((err) => {
        message.reply(`:x: ${err}`);
      });
  }
}
module.exports = {
  PingCommand,
};
