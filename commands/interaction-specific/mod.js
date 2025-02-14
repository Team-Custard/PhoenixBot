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
          name: "pardon",
          chatInputRun: "chatInputPardon",
        },
        {
          name: "infractions",
          chatInputRun: "chatInputInfractions",
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
          command.setName("pardon").setDescription("Marks a warning as inactive")
          .addIntegerOption(option => option
            .setName(`case_id`)
            .setDescription(`The case id to pardon`)
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
  async chatInputPardon(interaction, context) {
    const command = await this.container.stores.get("commands").get("pardon");
    const valid = await command.preconditions.chatInputRun(interaction, command, context)
    if (valid.isErr()) return interaction.reply({ ephemeral:true, content: `${this.container.emojis.error} ${await valid.unwrapErr()}` });
    await this.container.stores.get("commands").get("pardon").chatInputRun(interaction, context);
  }
  async chatInputInfractions(interaction, context) {
    const command = await this.container.stores.get("commands").get("infractions");
    const valid = await command.preconditions.chatInputRun(interaction, command, context)
    if (valid.isErr()) return interaction.reply({ ephemeral:true, content: `${this.container.emojis.error} ${await valid.unwrapErr()}` });
    await this.container.stores.get("commands").get("infractions").chatInputRun(interaction, context);
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
