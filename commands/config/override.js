const { Subcommand } = require("@sapphire/plugin-subcommands");
const { isMessageInstance } = require("@sapphire/discord.js-utilities");
const { Command, ApplicationCommandRegistry } = require("@sapphire/framework");
const { PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, Colors } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "override",
      aliases: ["grant", "permission"],
      description: "Creates a precondition override for a command, allowing the command to be used without the user having the needed permission to use it. For instance, you can use this command while creating a \"mod role\" where users with this role can moderate without you having to grant them the **ban members** permission to be able to use the commands.",
      detailedDescription: {
        usage: "override <role> <command> [add/remove]",
        examples: ["override @mod ban add"],
      },
      cooldownDelay: 3_000,
      subcommands: [{
        name: 'display',
        chatInputRun: 'chatInputDisplay',
        messageRun: 'messageDisplay',
        default: true
      }, {
        name: 'create',
        chatInputRun: 'chatInputCreate',
        messageRun: 'messageCreate'
      }, {
        name: 'remove',
        chatInputRun: 'chatInputRemove',
        messageRun: 'messageRemove'
      }],
      suggestedUserPermissions: [PermissionFlagsBits.ManageGuild],
      preconditions: ["module"]
    });
  }

  /**
   * @param {ApplicationCommandRegistry} registry 
   */
  registerApplicationCommands(registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("override")
      .setDescription("Command override settings")
      .addSubcommand(subcommand =>
        subcommand.setName('display')
        .setDescription('Displays all overrides set in the server.')
      )
      .addSubcommand(subcommand =>
        subcommand.setName('create')
        .setDescription('Creates a grant')
        .addStringOption(option => option
            .setName("command")
            .setDescription("The command to modify")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addRoleOption(option => option
            .setName("role")
            .setDescription("The role to grant")
            .setRequired(true)
        )
      )
      .addSubcommand(subcommand =>
        subcommand.setName('remove')
        .setDescription('Removes a grant')
        .addStringOption(option => option
            .setName("command")
            .setDescription("The command to modify")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addRoleOption(option => option
            .setName("role")
            .setDescription("The role to remove from grant")
            .setRequired(true)
        )
      )
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    );
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputDisplay(interaction) {
    await interaction.deferReply();
    const db = await serverSettings.findById(interaction.guild.id).cacheQuery();
    if (db.permissionOverrides.length == 0) return interaction.followUp(`${this.container.emojis.error} No overrides was created yet.`);
    const embed = new EmbedBuilder()
    .setDescription(`${db.permissionOverrides.map(r => `<@&${r.role_id}> : ${r.grant.map(g => `${g}`)}`).join(`\n`)}`)
    .setColor(Colors.Orange)
    interaction.followUp({ embeds: [embed] });
  }
  async messageDisplay(message) {
    const db = await serverSettings.findById(message.guild.id).cacheQuery();
    if (db.permissionOverrides.length == 0) return message.reply(`${this.container.emojis.error} No overrides was created yet.`);
    const embed = new EmbedBuilder()
    .setDescription(`${db.permissionOverrides.map(r => `<@&${r.role_id}> : ${r.grant.map(g => `${g}`)}`).join(`\n`)}`)
    .setColor(Colors.Orange)
    message.reply({ embeds: [embed] });
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputCreate(interaction) {
    await interaction.deferReply();
    const cmd = interaction.options.getString("command");
    const role = interaction.options.getRole("role");
    const check = this.container.client.stores
    .get("commands")
    .find((i) => (i.name === cmd));

    if (!check) return interaction.followUp(`${this.container.emojis.error} Command not found.`);
    const db = await serverSettings.findById(interaction.guild.id).cacheQuery();
    const overrides = db.permissionOverrides.find(p => p.role_id == role.id);
    if (overrides) {
        if (overrides.grant.find(g => g == cmd)) return interaction.followUp(`${this.container.emojis.error} Override already exists.`);
        overrides.grant.push(cmd);
    }
    else db.permissionOverrides.push({
        role_id: role.id,
        grant: [cmd]
    });
    await db.save();
    interaction.followUp({content: `${this.container.emojis.success} Granted ${role} permission to use \`${cmd}\`. For this change to apply to slash commands you have to grant permissions for the role to use the command in discord's server settings on a computer.`, allowedMentions: {parse: []}});
  }
  async messageCreate(message) {
    const cmd = await args.push("string");
    const role = await args.push("role");
    const check = this.container.client.stores
    .get("commands")
    .find((i) => (i.name === cmd));

    if (!check) return message.reply(`${this.container.emojis.error} Command not found.`);
    const db = await serverSettings.findById(message.guild.id).cacheQuery();
    const overrides = db.permissionOverrides.find(p => p.role_id == role.id);
    if (overrides) {
        if (overrides.grant.find(g => g == cmd)) return message.reply(`${this.container.emojis.error} Override already exists.`);
        overrides.grant.push(cmd);
    }
    else db.permissionOverrides.push({
        role_id: role.id,
        grant: [cmd]
    });
    await db.save();
    message.reply({content: `${this.container.emojis.success} Granted ${role} permission to use \`${cmd}\`. For this change to apply to slash commands you have to grant permissions for the role to use the command in discord's server settings on a computer.`, allowedMentions: {parse: []}});
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputRemove(interaction) {
    await interaction.deferReply();
    const cmd = interaction.options.getString("command");
    const role = interaction.options.getRole("role");
    const check = this.container.client.stores
    .get("commands")
    .find((i) => (i.name === cmd));

    if (!check) return interaction.followUp(`${this.container.emojis.error} Command not found.`);
    const db = await serverSettings.findById(interaction.guild.id).cacheQuery();
    const overrides = db.permissionOverrides.find(p => p.role_id == role.id);
    if (overrides) {
        if (!overrides.grant.find(g => g == cmd)) return interaction.followUp(`${this.container.emojis.error} Grant doesn't exist.`);
        overrides.grant.slice(overrides.grant.findIndex(c => c == cmd), 1);
    }
    else return interaction.followUp(`${this.container.emojis.error} Override not found.`);
    await db.save();
    interaction.followUp({content: `${this.container.emojis.success} Removed permission for ${role} to use \`${cmd}\`. For this change to apply to slash commands you have to remove permissions for the role to use the command in discord's server settings on a computer.`, allowedMentions: {parse: []}});
  }

  async messageRemove(message, args) {
    const cmd = await args.push("string");
    const role = await args.push("role");
    const check = this.container.client.stores
    .get("commands")
    .find((i) => (i.name === cmd));

    if (!check) return message.reply(`${this.container.emojis.error} Command not found.`);
    const db = await serverSettings.findById(message.guild.id).cacheQuery();
    const overrides = db.permissionOverrides.find(p => p.role_id == role.id);
    if (overrides) {
        if (!overrides.grant.find(g => g == cmd)) return message.reply(`${this.container.emojis.error} Grant doesn't exist.`);
        overrides.grant.slice(overrides.grant.findIndex(c => c == cmd), 1);
    }
    else return message.reply(`${this.container.emojis.error} Override not found.`);
    await db.save();
    message.reply({content: `${this.container.emojis.success} Removed permission for ${role} to use \`${cmd}\`. For this change to apply to slash commands you have to remove permissions for the role to use the command in discord's server settings on a computer.`, allowedMentions: {parse: []}});
  }
}
module.exports = {
  PingCommand,
};
