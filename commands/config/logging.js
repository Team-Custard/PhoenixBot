const { Subcommand } = require("@sapphire/plugin-subcommands");
const { BucketScope } = require("@sapphire/framework");
const serverSettings = require("../../tools/SettingsSchema");
const { PermissionFlagsBits, EmbedBuilder, Colors } = require("discord.js");

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "logging",
      aliases: ["log"],
      description:
        "Configures logging of events on the server. The bot creates a webhook used for logging as it reduces the chance of a rate limit.",
      detailedDescription: {
        usage: "logging [log] <channel>",
        examples: ["logging members #memberlog"],
        args: ["log: The log to manage", "channel: The channel to use"],
      },
      subcommands: [
        {
          name: "display",
          chatInputRun: "chatInputDisplay",
          messageRun: "messageDisplay",
          default: true,
        },
        {
          name: "members",
          chatInputRun: "chatInputMembers",
          messageRun: "messageMembers",
        },
        {
          name: "messages",
          chatInputRun: "chatInputMessages",
          messageRun: "messageMessages",
        },
        {
          name: "moderation",
          chatInputRun: "chatInputModeration",
          messageRun: "messageModeration",
        },
        {
          name: "infractions",
          chatInputRun: "chatInputInfractions",
          messageRun: "messageInfractions",
        },
        {
          name: "roles",
          chatInputRun: "chatInputRoles",
          messageRun: "messageRoles",
        },
        {
          name: "voice",
          chatInputRun: "chatInputVoice",
          messageRun: "messageVoice",
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
        .setName("logging")
        .setDescription("Commands for handling logging")
        .addSubcommand((command) =>
          command
            .setName("display")
            .setDescription("Displays current logging settings."),
        )
        .addSubcommand((command) =>
          command
            .setName("members")
            .setDescription("Member joins/leaves and updates logging.")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("The channel to use. Leave blank to clear.")
                .setRequired(false),
            ),
        )
        .addSubcommand((command) =>
          command
            .setName("messages")
            .setDescription("Message deletions and updates logging.")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("The channel to use. Leave blank to clear.")
                .setRequired(false),
            ),
        )
        .addSubcommand((command) =>
          command
            .setName("moderation")
            .setDescription(
              "Moderation action logging. Note this is not Phoenix modlogging.",
            )
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("The channel to use. Leave blank to clear.")
                .setRequired(false),
            ),
        )
        .addSubcommand((command) =>
          command
            .setName("infractions")
            .setDescription(
              "Logs moderation cases made through Phoenix.",
            )
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("The channel to use. Leave blank to clear.")
                .setRequired(false),
            ),
        )
        .addSubcommand((command) =>
          command
            .setName("roles")
            .setDescription("Logs member role updates.")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("The channel to use. Leave blank to clear.")
                .setRequired(false),
            ),
        )
        .addSubcommand((command) =>
          command
            .setName("voice")
            .setDescription(
              "Logs member voice channel joins, kicks, and mutes/deafens.",
            )
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("The channel to use. Leave blank to clear.")
                .setRequired(false),
            ),
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

    const embed = new EmbedBuilder()
      .setAuthor({
        name: interaction.guild.name,
        iconURL: interaction.guild.iconURL({ dynamic: true }),
      })
      .setDescription(
        `**Current logging settings**\n` +
          `Messages: ${db.logging.messages ? `<#${db.logging.messages}>` : `Unset`}\n` +
          `Members: ${db.logging.members ? `<#${db.logging.members}>` : `Unset`}\n` +
          `Moderation: ${db.logging.moderation ? `<#${db.logging.moderation}>` : `Unset`}\n` +
          `Infractions: ${db.logging.infractions ? `<#${db.logging.infractions}>` : `Unset`}\n` +
          `Roles: ${db.logging.roles ? `<#${db.logging.roles}>` : `Unset`}\n` +
          `Voice: ${db.logging.voice ? `<#${db.logging.voice}>` : `Unset`}`,
      )
      .setColor(Colors.Orange)
      .setTimestamp(new Date());
    interaction.followUp({ embeds: [embed] });
  }

  async chatInputMessages(interaction) {
    await interaction.deferReply();
    const channel = interaction.options.getChannel("channel");
    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();
    let successMsg = "";
    if (channel) {
      db.logging.messages = channel.id;
      successMsg = `:white_check_mark: Log successfully set to ${channel}.`;
    }
 else {
      db.logging.messages = null;
      successMsg = `:white_check_mark: Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        interaction.followUp(successMsg);
      })
      .catch((err) => {
        interaction.followUp(`:x: ${err}`);
      });
  }

  async chatInputMembers(interaction) {
    await interaction.deferReply();
    const channel = interaction.options.getChannel("channel");
    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();
    let successMsg = "";
    if (channel) {
      db.logging.members = channel.id;
      successMsg = `:white_check_mark: Log successfully set to ${channel}.`;
    }
 else {
      db.logging.members = null;
      successMsg = `:white_check_mark: Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        interaction.followUp(successMsg);
      })
      .catch((err) => {
        interaction.followUp(`:x: ${err}`);
      });
  }

  async chatInputModeration(interaction) {
    await interaction.deferReply();
    const channel = interaction.options.getChannel("channel");
    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();
    let successMsg = "";
    if (channel) {
      db.logging.moderation = channel.id;
      successMsg = `:white_check_mark: Log successfully set to ${channel}.`;
    }
 else {
      db.logging.moderation = null;
      successMsg = `:white_check_mark: Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        interaction.followUp(successMsg);
      })
      .catch((err) => {
        interaction.followUp(`:x: ${err}`);
      });
  }

  async chatInputInfractions(interaction) {
    await interaction.deferReply();
    const channel = interaction.options.getChannel("channel");
    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();
    let successMsg = "";
    if (channel) {
      db.logging.infractions = channel.id;
      successMsg = `:white_check_mark: Log successfully set to ${channel}.`;
    }
 else {
      db.logging.infractions = null;
      successMsg = `:white_check_mark: Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        interaction.followUp(successMsg);
      })
      .catch((err) => {
        interaction.followUp(`:x: ${err}`);
      });
  }

  async chatInputRoles(interaction) {
    await interaction.deferReply();
    const channel = interaction.options.getChannel("channel");
    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();
    let successMsg = "";
    if (channel) {
      db.logging.roles = channel.id;
      successMsg = `:white_check_mark: Log successfully set to ${channel}.`;
    }
 else {
      db.logging.roles = null;
      successMsg = `:white_check_mark: Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        interaction.followUp(successMsg);
      })
      .catch((err) => {
        interaction.followUp(`:x: ${err}`);
      });
  }

  async chatInputVoice(interaction) {
    await interaction.deferReply();
    const channel = interaction.options.getChannel("channel");
    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();
    let successMsg = "";
    if (channel) {
      db.logging.voice = channel.id;
      successMsg = `:white_check_mark: Log successfully set to ${channel}.`;
    }
 else {
      db.logging.voice = null;
      successMsg = `:white_check_mark: Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        interaction.followUp(successMsg);
      })
      .catch((err) => {
        interaction.followUp(`:x: ${err}`);
      });
  }
}
module.exports = {
  PingCommand,
};
