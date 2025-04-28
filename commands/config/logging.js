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
          name: "users",
          chatInputRun: "chatInputUsers",
          messageRun: "messageUsers",
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
        {
          name: "commands",
          chatInputRun: "chatInputCommands",
          messageRun: "messageCommands",
        },
        {
          name: "automod",
          chatInputRun: "chatInputAutomod",
          messageRun: "messageAutomod",
        },
        {
          name: "verification",
          chatInputRun: "chatInputVerification",
          messageRun: "messageVerification",
        },
      ],
      cooldownDelay: 60_000,
      cooldownLimit: 6,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      suggestedUserPermissions: [PermissionFlagsBits.ManageGuild],
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
            .setDescription("Logs moderation cases made through Phoenix.")
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
              "Logs member joins or leaves a voice channel.",
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
            .setName("users")
            .setDescription(
              "Logs when a user changes their username and avatars.",
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
            .setName("commands")
            .setDescription(
              "Logs when a member uses a command.",
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
            .setName("automod")
            .setDescription(
              "Logs when a member triggers Phoenix's automod.",
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
            .setName("verification")
            .setDescription(
              "Logs when a member passes or fails verification.",
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
          `Users: ${db.logging.users ? `<#${db.logging.users}>` : `Unset`}\n` +
          `Moderation: ${db.logging.moderation ? `<#${db.logging.moderation}>` : `Unset`}\n` +
          `Infractions: ${db.logging.infractions ? `<#${db.logging.infractions}>` : `Unset`}\n` +
          `Voice: ${db.logging.voice ? `<#${db.logging.voice}>` : `Unset`}\n` +
          `Commands: ${db.logging.commands ? `<#${db.logging.commands}>` : `Unset`}`,
      )
      .setColor(Colors.Orange)
      .setTimestamp(new Date());
    interaction.followUp({ embeds: [embed] });
  }

  async messageDisplay(message) {
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    const embed = new EmbedBuilder()
      .setAuthor({
        name: message.guild.name,
        iconURL: message.guild.iconURL({ dynamic: true }),
      })
      .setDescription(
        `**Current logging settings**\n` +
          `Messages: ${db.logging.messages ? `<#${db.logging.messages}>` : `Unset`}\n` +
          `Members: ${db.logging.members ? `<#${db.logging.members}>` : `Unset`}\n` +
          `Users: ${db.logging.users ? `<#${db.logging.users}>` : `Unset`}\n` +
          `Moderation: ${db.logging.moderation ? `<#${db.logging.moderation}>` : `Unset`}\n` +
          `Infractions: ${db.logging.infractions ? `<#${db.logging.infractions}>` : `Unset`}\n` +
          `Roles: ${db.logging.roles ? `<#${db.logging.roles}>` : `Unset`}\n` +
          `Voice: ${db.logging.voice ? `<#${db.logging.voice}>` : `Unset`}\n` +
          `Commands: ${db.logging.commands ? `<#${db.logging.commands}>` : `Unset`}`,
      )
      .setColor(Colors.Orange)
      .setTimestamp(new Date());
    message.reply({ embeds: [embed] });
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
      successMsg = `${this.container.emojis.success} Log successfully set to ${channel}.`;
    } else {
      db.logging.messages = null;
      successMsg = `${this.container.emojis.success} Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        interaction.followUp(successMsg);
      })
      .catch((err) => {
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      });
  }

  async messageMessages(message, args) {
    const channel = await args.pick("channel").catch(() => undefined);
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();
    let successMsg = "";
    if (channel) {
      db.logging.messages = channel.id;
      successMsg = `${this.container.emojis.success} Log successfully set to ${channel}.`;
    } else {
      db.logging.messages = null;
      successMsg = `${this.container.emojis.success} Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        message.reply(successMsg);
      })
      .catch((err) => {
        message.reply(`${this.container.emojis.error} ${err}`);
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
      successMsg = `${this.container.emojis.success} Log successfully set to ${channel}.`;
    } else {
      db.logging.members = null;
      successMsg = `${this.container.emojis.success} Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        interaction.followUp(successMsg);
      })
      .catch((err) => {
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      });
  }
  async messageMembers(message, args) {
    const channel = await args.pick("channel").catch(() => undefined);
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();
    let successMsg = "";
    if (channel) {
      db.logging.members = channel.id;
      successMsg = `${this.container.emojis.success} Log successfully set to ${channel}.`;
    } else {
      db.logging.members = null;
      successMsg = `${this.container.emojis.success} Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        message.reply(successMsg);
      })
      .catch((err) => {
        message.reply(`${this.container.emojis.error} ${err}`);
      });
  }

  async chatInputUsers(interaction) {
    await interaction.deferReply();
    const channel = interaction.options.getChannel("channel");
    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();
    let successMsg = "";
    if (channel) {
      db.logging.users = channel.id;
      successMsg = `${this.container.emojis.success} Log successfully set to ${channel}.`;
    } else {
      db.logging.users = null;
      successMsg = `${this.container.emojis.success} Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        interaction.followUp(successMsg);
      })
      .catch((err) => {
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      });
  }
  async messageUsers(message, args) {
    const channel = await args.pick("channel").catch(() => undefined);
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();
    let successMsg = "";
    if (channel) {
      db.logging.users = channel.id;
      successMsg = `${this.container.emojis.success} Log successfully set to ${channel}.`;
    } else {
      db.logging.users = null;
      successMsg = `${this.container.emojis.success} Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        message.reply(successMsg);
      })
      .catch((err) => {
        message.reply(`${this.container.emojis.error} ${err}`);
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
      successMsg = `${this.container.emojis.success} Log successfully set to ${channel}.`;
    } else {
      db.logging.moderation = null;
      successMsg = `${this.container.emojis.success} Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        interaction.followUp(successMsg);
      })
      .catch((err) => {
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      });
  }
  async messageModeration(message, args) {
    const channel = await args.pick("channel").catch(() => undefined);
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();
    let successMsg = "";
    if (channel) {
      db.logging.moderation = channel.id;
      successMsg = `${this.container.emojis.success} Log successfully set to ${channel}.`;
    } else {
      db.logging.moderation = null;
      successMsg = `${this.container.emojis.success} Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        message.reply(successMsg);
      })
      .catch((err) => {
        message.reply(`${this.container.emojis.error} ${err}`);
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
      successMsg = `${this.container.emojis.success} Log successfully set to ${channel}.`;
    } else {
      db.logging.infractions = null;
      successMsg = `${this.container.emojis.success} Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        interaction.followUp(successMsg);
      })
      .catch((err) => {
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      });
  }
  async messageInfractions(message, args) {
    const channel = await args.pick("channel").catch(() => undefined);
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();
    let successMsg = "";
    if (channel) {
      db.logging.infractions = channel.id;
      successMsg = `${this.container.emojis.success} Log successfully set to ${channel}.`;
    } else {
      db.logging.infractions = null;
      successMsg = `${this.container.emojis.success} Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        message.reply(successMsg);
      })
      .catch((err) => {
        message.reply(`${this.container.emojis.error} ${err}`);
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
      successMsg = `${this.container.emojis.success} Log successfully set to ${channel}.`;
    } else {
      db.logging.roles = null;
      successMsg = `${this.container.emojis.success} Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        interaction.followUp(successMsg);
      })
      .catch((err) => {
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      });
  }
  async messageRoles(message, args) {
    const channel = await args.pick("channel").catch(() => undefined);
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();
    let successMsg = "";
    if (channel) {
      db.logging.roles = channel.id;
      successMsg = `${this.container.emojis.success} Log successfully set to ${channel}.`;
    } else {
      db.logging.roles = null;
      successMsg = `${this.container.emojis.success} Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        message.reply(successMsg);
      })
      .catch((err) => {
        message.reply(`${this.container.emojis.error} ${err}`);
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
      successMsg = `${this.container.emojis.success} Log successfully set to ${channel}.`;
    } else {
      db.logging.voice = null;
      successMsg = `${this.container.emojis.success} Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        interaction.followUp(successMsg);
      })
      .catch((err) => {
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      });
  }
  async messageVoice(message, args) {
    const channel = await args.pick("channel").catch(() => undefined);
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();
    let successMsg = "";
    if (channel) {
      db.logging.voice = channel.id;
      successMsg = `${this.container.emojis.success} Log successfully set to ${channel}.`;
    } else {
      db.logging.voice = null;
      successMsg = `${this.container.emojis.success} Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        message.reply(successMsg);
      })
      .catch((err) => {
        message.reply(`${this.container.emojis.error} ${err}`);
      });
  }

  async chatInputCommands(interaction) {
    await interaction.deferReply();
    const channel = interaction.options.getChannel("channel");
    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();
    let successMsg = "";
    if (channel) {
      db.logging.commands = channel.id;
      successMsg = `${this.container.emojis.success} Log successfully set to ${channel}.`;
    } else {
      db.logging.commands = null;
      successMsg = `${this.container.emojis.success} Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        interaction.followUp(successMsg);
      })
      .catch((err) => {
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      });
  }
  async messageAutomod(message, args) {
    const channel = await args.pick("channel").catch(() => undefined);
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();
    let successMsg = "";
    if (channel) {
      db.logging.automod = channel.id;
      successMsg = `${this.container.emojis.success} Log successfully set to ${channel}.`;
    } else {
      db.logging.automod = null;
      successMsg = `${this.container.emojis.success} Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        message.reply(successMsg);
      })
      .catch((err) => {
        message.reply(`${this.container.emojis.error} ${err}`);
      });
  }

  async messageVerification(message, args) {
    const channel = await args.pick("channel").catch(() => undefined);
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();
    let successMsg = "";
    if (channel) {
      db.logging.verification = channel.id;
      successMsg = `${this.container.emojis.success} Log successfully set to ${channel}.`;
    } else {
      db.logging.verification = null;
      successMsg = `${this.container.emojis.success} Log successfully cleared.`;
    }
    db.save()
      .then(() => {
        message.reply(successMsg);
      })
      .catch((err) => {
        message.reply(`${this.container.emojis.error} ${err}`);
      });
  }
}
module.exports = {
  PingCommand,
};
