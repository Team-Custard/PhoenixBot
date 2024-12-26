const { BucketScope, Args } = require("@sapphire/framework");
const { Subcommand } = require("@sapphire/plugin-subcommands");
const serverSettings = require("../../tools/SettingsSchema");
const { PermissionFlagsBits } = require("discord.js");

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "cc",
      aliases: ["custom","customcommand", "tagsv2"],
      description: "Configures custom commands powered by tagsv2. The ability to run custom commands are not support slash commands.",
      detailedDescription: {
        usage: "cc [subcommand] <name>",
        examples: [
          "cc list",
          "cc breezip"
        ],
        args: [
          "subcommand: Can be run/list/add/remove/info.",
          "name: The name of the tag.",
        ],
      },
      subcommands: [
        {
          name: "list",
          chatInputRun: "chatInputList",
          messageRun: "messageList",
          default: true,
        },
        {
          name: "add",
          chatInputRun: "chatInputAdd",
          messageRun: "messageAdd",
        },
        {
          name: "remove",
          chatInputRun: "chatInputRemove",
          messageRun: "messageRemove",
        },
        {
          name: "info",
          chatInputRun: "chatInputInfo",
          messageRun: "messageInfo",
        }
      ],
      cooldownDelay: 15_000,
      cooldownLimit: 3,
      cooldownScope: BucketScope.Guild,
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ["module"]
    });
  }

  registerApplicationCommands(registry) {
    registry.idHints = ["1227016558778519622"];
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("cc")
        .setDescription("Displays custom commands.")
        .addSubcommand((command) =>
          command.setName("list").setDescription("List all custom commands in the server"),
        )
        .addSubcommand((command) =>
          command
            .setName("add")
            .setDescription("Adds a custom command to the server")
            .addStringOption((option) =>
              option
                .setName("name")
                .setDescription("The name of the custom command (12 char max)")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("code")
                .setDescription("The code of the custom command")
                .setRequired(true),
            ),
        )
        .addSubcommand((command) =>
          command
            .setName("remove")
            .setDescription("Removes a custom command from the server")
            .addStringOption((option) =>
              option
                .setName("name")
                .setDescription("The name of the custom command")
                .setRequired(true),
            ),
        )
        .addSubcommand((command) =>
          command
            .setName("info")
            .setDescription("Displays the code to a custom command")
            .addStringOption((option) =>
              option
                .setName("name")
                .setDescription("The name of the custom command")
                .setRequired(true),
            ),
        )
        .setDMPermission(false),
    );
  }

  async chatInputAdd(interaction) {
    return interaction.reply(`${this.container.emojis.error} Custom commands are coming soon.`);
  }

  async messageAdd(message, args) {
    return message.reply(`${this.container.emojis.error} Custom commands are coming soon.`);
    const name = await args.pick("string");
    const cmds = await args.rest("string");

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    const tag = db?.cc.find((t) => t.name == name);

    if (tag) return message.reply(`${this.container.emojis.error} Tag already exists.`);
    if (name.length > 12) {
      return message.reply(`${this.container.emojis.error} Command name is too long.`);
    }

    if (db?.cc.length > 10) {
      return message.reply(
        `${this.container.emojis.error} You've maxed out on the maximum of tags you can hold in the server. Limit is 10.`,
      );
    }

    db?.cc.push({
      name: name,
      code: cmds,
      creator: message.author.username,
    });

    db?.save()
      .then(() => {
        message.reply(
          `${this.container.emojis.success} Successfully added command \`${name}\`.`,
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