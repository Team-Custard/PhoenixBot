const { isMessageInstance } = require("@sapphire/discord.js-utilities");
const { Command, ApplicationCommandRegistry } = require("@sapphire/framework");
const { PermissionFlagsBits, ChatInputCommandInteraction } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "toggle",
      aliases: ["enable"],
      description: "Toggles a command",
      detailedDescription: {
        usage: "toggle <command>",
        examples: ["toggle ping"],
      },
      cooldownDelay: 3_000,
      suggestedUserPermissions: [PermissionFlagsBits.ManageGuild],
      preconditions: ["module"]
    });
  }

  /**
   * @param {ApplicationCommandRegistry} registry 
   */
  registerApplicationCommands(registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("toggle")
      .setDescription("Enables/disables a command")
      .addStringOption(option => option
        .setName("command")
        .setDescription("The command to toggle")
        .setRequired(true)
        .setAutocomplete(true)
      )
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    );
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputRun(interaction) {
    await interaction.deferReply();
    const cmd = interaction.options.getString("command");
    const check = this.container.client.stores
    .get("commands")
    .find((i) => (i.name === cmd));

    if (!check) return interaction.followUp(`${this.container.emojis.error} Command not found.`);
    if (cmd == "toggle") return interaction.followUp(`${this.container.emojis.error} You cannot disable the toggle command as it's needed to enable commands.`);

    const db = await serverSettings.findById(interaction.guild.id).cacheQuery();

    if (db.disabledCommands.find(c => c == cmd)) {
        db.disabledCommands.splice(db.disabledCommands.indexOf(cmd), 1);
        await db.save();
        await interaction.followUp(`${this.container.emojis.success} Enabled command **${check.name}**. For this change to apply to slash commands you have to set permissions for everyone to use the command in discord's server settings on a computer.`);
    } else {
        db.disabledCommands.push(check.name);
        await db.save();
        await interaction.followUp(`${this.container.emojis.success} Disabled command **${check.name}**. For this change to apply to slash commands you have to set permissions for eveyone to use the command in discord's server settings on a computer.`);
    }
  }

  async messageRun(message, args) {
    const cmd = await args.pick("string");
    const check = this.container.client.stores
    .get("commands")
    .find((i) => (i.name === cmd));

    if (!check) return message.reply(`${this.container.emojis.error} Command not found.`);
    if (cmd == "toggle") return message.reply(`${this.container.emojis.error} You cannot disable the toggle command as it's needed to enable commands.`);

    const db = await serverSettings.findById(message.guild.id).cacheQuery();

    if (db.disabledCommands.find(c => c == cmd)) {
        db.disabledCommands.splice(db.disabledCommands.indexOf(cmd), 1);
        await db.save();
        await message.reply(`${this.container.emojis.success} Enabled command **${check.name}**.`);
    } else {
        db.disabledCommands.push(check.name);
        await db.save();
        await message.reply(`${this.container.emojis.success} Disabled command **${check.name}**.`);
    }
  }
}
module.exports = {
  PingCommand,
};
