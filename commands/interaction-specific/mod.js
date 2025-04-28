const { PermissionFlagsBits, ChatInputCommandInteraction } = require("discord.js");
const { Subcommand } = require("@sapphire/plugin-subcommands");
const { BucketScope, ApplicationCommandRegistry, ChatInputCommandContext } = require("@sapphire/framework");

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "mod",
      subcommands: [
        {
          name: "appeals-link",
          chatInputRun: "chatInputAppeal",
        },
        {
          name: "asciify",
          chatInputRun: "chatInputAsciify",
        },
        {
          name: "ban",
          chatInputRun: "chatInputBan",
        },
        {
          name: "dehoist",
          chatInputRun: "chatInputDehoist",
        },
        {
          name: "nick",
          chatInputRun: "chatInputNick",
        },
        {
          name: "pardon",
          chatInputRun: "chatInputPardon",
        },
        {
          name: "reason",
          chatInputRun: "chatInputReason",
        },
        {
          name: "infractions",
          chatInputRun: "chatInputInfractions",
        },
        {
          name: "slowmode",
          chatInputRun: "chatInputSlowmode",
        },
        {
          name: "unban",
          chatInputRun: "chatInputUnban",
        },
        {
          name: "warn",
          chatInputRun: "chatInputWarn",
        },
      ]
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
        .setName("mod")
        .setDescription("Mod commands")
        .addSubcommand((command) =>
          command.setName("appeals-link").setDescription("Sets the server's ban appeal link to be sent if the user gets banned")
          .addStringOption(option => option
            .setName(`link`)
            .setDescription(`The ban appeal link. Leave blank to clear.`)
          )
        )
        .addSubcommand((command) =>
          command.setName("asciify").setDescription("Cleans a member's nickname")
          .addUserOption(option => option
            .setName(`member`)
            .setDescription(`The member to manage`)
            .setRequired(true)
          )
        )
        .addSubcommand((command) =>
          command.setName("ban").setDescription("Bans a user from the server")
          .addUserOption(option => option
            .setName(`user`)
            .setDescription(`The user to ban`)
            .setRequired(true)
          )
          .addStringOption(option => option
            .setName(`duration`)
            .setDescription(`The duration of the ban`)
          )
          .addStringOption(option => option
            .setName(`reason`)
            .setDescription(`The reason for the infraction`)
          )
          .addBooleanOption(option => option
            .setName(`silent`)
            .setDescription(`If enabled, the user will not recieve a dm about this warning`)
          )
          .addBooleanOption(option => option
            .setName(`hidden`)
            .setDescription(`If enabled, the user will not see who created this case`)
          )
          .addBooleanOption(option => option
            .setName(`purge`)
            .setDescription(`If enabled, 7 days worth of the user's messages will be purged`)
          )
          .addBooleanOption(option => option
            .setName(`unappealable`)
            .setDescription(`If enabled, the bot will not send the ban appeal link`)
          )
        )
        .addSubcommand((command) =>
          command.setName("dehoist").setDescription("Sends a hoisting member to the bottom")
          .addUserOption(option => option
            .setName(`member`)
            .setDescription(`The member to manage`)
            .setRequired(true)
          )
        )
        .addSubcommand((command) =>
          command.setName("nick").setDescription("Changes a user's nickname")
          .addUserOption(option => option
            .setName(`member`)
            .setDescription(`The member to manage`)
            .setRequired(true)
          )
          .addStringOption(option => option
            .setName(`nickname`)
            .setDescription(`The nickname to use. Leave blank to reset.`)
          )
        )
        .addSubcommand((command) =>
          command.setName("pardon").setDescription("Marks a warning as inactive")
          .addIntegerOption(option => option
            .setName(`case_id`)
            .setDescription(`The case id to pardon`)
            .setRequired(true)
          )
        )
        .addSubcommand((command) =>
          command.setName("reason").setDescription("Sets the reason for a case")
          .addIntegerOption(option => option
            .setName(`case_id`)
            .setDescription(`The case id to modify`)
            .setRequired(true)
          )
          .addStringOption(option => option
            .setName(`reason`)
            .setDescription(`The new reason for the case`)
            .setRequired(true)
          )
        )
        .addSubcommand((command) =>
          command.setName("infractions").setDescription("Displays a user's infractions")
          .addUserOption(option => option
            .setName(`user`)
            .setDescription(`The user to check`)
            .setRequired(true)
          )
          .addStringOption(option => option
            .setName(`punishment`)
            .setDescription(`Search for a specific punishment`)
          )
          .addBooleanOption(option => option
            .setName(`long`)
            .setDescription(`If enabled, displays the embed as a long list`)
          )
        )
        .addSubcommand((command) =>
          command.setName("slowmode").setDescription("Changes the slowmode of a channel")
          .addStringOption(option => option
            .setName(`time`)
            .setDescription(`The cooldown of the channel`)
            .setRequired(true)
          )
          .addChannelOption(option => option
            .setName(`channel`)
            .setDescription(`The channel to change`)
            .setRequired(false)
          )
        )
        .addSubcommand((command) =>
          command.setName("unban").setDescription("Unbans a user")
          .addUserOption(option => option
            .setName(`user`)
            .setDescription(`The user to unban`)
            .setRequired(true)
          )
          .addStringOption(option => option
            .setName(`reason`)
            .setDescription(`The reason for the infraction`)
          )
        )
        .addSubcommand((command) =>
          command.setName("warn").setDescription("Gives a user a warning")
          .addUserOption(option => option
            .setName(`member`)
            .setDescription(`The member to warn`)
            .setRequired(true)
          )
          .addStringOption(option => option
            .setName(`reason`)
            .setDescription(`The reason for the infraction`)
          )
          .addBooleanOption(option => option
            .setName(`silent`)
            .setDescription(`If enabled, the user will not recieve a dm about this warning`)
          )
          .addBooleanOption(option => option
            .setName(`hidden`)
            .setDescription(`If enabled, the user will not see who created this case`)
          )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),
    );
  }

  /**
   * 
   * @param {ChatInputCommandInteraction} interaction 
   * @param {ChatInputCommandContext} context 
   */
  async chatInputAppeal(interaction, context) {
    const command = await this.container.stores.get("commands").get("appeals-link");
    const valid = await command.preconditions.chatInputRun(interaction, command, context)
    if (valid.isErr()) return interaction.reply({ ephemeral:true, content: `${this.container.emojis.error} ${await valid.unwrapErr()}` });
    await this.container.stores.get("commands").get("appeals-link").chatInputRun(interaction, context);
  }
  async chatInputAsciify(interaction, context) {
    const command = await this.container.stores.get("commands").get("asciify");
    const valid = await command.preconditions.chatInputRun(interaction, command, context)
    if (valid.isErr()) return interaction.reply({ ephemeral:true, content: `${this.container.emojis.error} ${await valid.unwrapErr()}` });
    await this.container.stores.get("commands").get("asciify").chatInputRun(interaction, context);
  }
  async chatInputBan(interaction, context) {
    const command = await this.container.stores.get("commands").get("ban");
    const valid = await command.preconditions.chatInputRun(interaction, command, context)
    if (valid.isErr()) return interaction.reply({ ephemeral:true, content: `${this.container.emojis.error} ${await valid.unwrapErr()}` });
    await this.container.stores.get("commands").get("ban").chatInputRun(interaction, context);
  }
  async chatInputDehoist(interaction, context) {
    const command = await this.container.stores.get("commands").get("dehoist");
    const valid = await command.preconditions.chatInputRun(interaction, command, context)
    if (valid.isErr()) return interaction.reply({ ephemeral:true, content: `${this.container.emojis.error} ${await valid.unwrapErr()}` });
    await this.container.stores.get("commands").get("dehoist").chatInputRun(interaction, context);
  }
  async chatInputNick(interaction, context) {
    const command = await this.container.stores.get("commands").get("nick");
    const valid = await command.preconditions.chatInputRun(interaction, command, context)
    if (valid.isErr()) return interaction.reply({ ephemeral:true, content: `${this.container.emojis.error} ${await valid.unwrapErr()}` });
    await this.container.stores.get("commands").get("nick").chatInputRun(interaction, context);
  }
  async chatInputPardon(interaction, context) {
    const command = await this.container.stores.get("commands").get("pardon");
    const valid = await command.preconditions.chatInputRun(interaction, command, context)
    if (valid.isErr()) return interaction.reply({ ephemeral:true, content: `${this.container.emojis.error} ${await valid.unwrapErr()}` });
    await this.container.stores.get("commands").get("pardon").chatInputRun(interaction, context);
  }
  async chatInputReason(interaction, context) {
    const command = await this.container.stores.get("commands").get("reason");
    const valid = await command.preconditions.chatInputRun(interaction, command, context)
    if (valid.isErr()) return interaction.reply({ ephemeral:true, content: `${this.container.emojis.error} ${await valid.unwrapErr()}` });
    await this.container.stores.get("commands").get("reason").chatInputRun(interaction, context);
  }
  async chatInputInfractions(interaction, context) {
    const command = await this.container.stores.get("commands").get("infractions");
    const valid = await command.preconditions.chatInputRun(interaction, command, context)
    if (valid.isErr()) return interaction.reply({ ephemeral:true, content: `${this.container.emojis.error} ${await valid.unwrapErr()}` });
    await this.container.stores.get("commands").get("infractions").chatInputRun(interaction, context);
  }
  async chatInputSlowmode(interaction, context) {
    const command = await this.container.stores.get("commands").get("slowmode");
    const valid = await command.preconditions.chatInputRun(interaction, command, context)
    if (valid.isErr()) return interaction.reply({ ephemeral:true, content: `${this.container.emojis.error} ${await valid.unwrapErr()}` });
    await this.container.stores.get("commands").get("slowmode").chatInputRun(interaction, context);
  }
  async chatInputUnban(interaction, context) {
    const command = await this.container.stores.get("commands").get("unban");
    const valid = await command.preconditions.chatInputRun(interaction, command, context)
    if (valid.isErr()) return interaction.reply({ ephemeral:true, content: `${this.container.emojis.error} ${await valid.unwrapErr()}` });
    await this.container.stores.get("commands").get("unban").chatInputRun(interaction, context);
  }
  async chatInputWarn(interaction, context) {
    const command = await this.container.stores.get("commands").get("warn");
    const valid = await command.preconditions.chatInputRun(interaction, command, context)
    if (valid.isErr()) return interaction.reply({ ephemeral:true, content: `${this.container.emojis.error} ${await valid.unwrapErr()}` });
    await this.container.stores.get("commands").get("warn").chatInputRun(interaction, context);
  }
}
module.exports = {
  PingCommand,
};
