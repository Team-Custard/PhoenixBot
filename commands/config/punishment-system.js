const { Subcommand } = require("@sapphire/plugin-subcommands");
const { ApplicationCommandRegistry, BucketScope } = require("@sapphire/framework");
const { PermissionFlagsBits, ChatInputCommandInteraction, PermissionsBitField, EmbedBuilder, Colors } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const { setTimeout } = require("timers/promises");

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "punishment-system",
      aliases: [`system`, `warnsystem`],
      description: "Sets up a punishment system which issues additional punishments when the user reaches a certain amount of active warnings.",
      detailedDescription: {
        usage: "punishment-system [action] <warns> <punishment> [duration]",
        args: ["action: list, add, remove", "warns: The amount of warnings till this punishment triggers", "punishment: The punishment to issue", "duration: The duration of the punishment"]
      },
      cooldownDelay: 30_000,
      cooldownScope: BucketScope.Guild,
      cooldownLimit: 3,
      suggestedUserPermissions: [PermissionFlagsBits.ManageGuild],
      subcommands: [{
        name: "list",
        chatInputRun: "chatInputList",
        messageRun: "messageList",
        default: true,
      }, {
        name: "add",
        chatInputRun: "chatInputAdd",
        messageRun: "messageAdd",
      }, {
        name: "remove",
        chatInputRun: "chatInputRemove",
        messageRun: "messageRemove",
      }],
      preconditions: ["module"]
    });
  }

  /**
   * @param {ApplicationCommandRegistry} registry 
   */
  registerApplicationCommands(registry) {
    registry.registerChatInputCommand(command => 
      command.setName("punishment-system")
      .setDescription("Configures this server's punishment system.")
      .addSubcommand(subcommand => 
        subcommand.setName("list")
        .setDescription("Lists the current punishment system")
      )
      .addSubcommand(subcommand =>
        subcommand.setName("add")
        .setDescription("Adds an action to the punishment system")
        .addIntegerOption(option => option
            .setName('warnings')
            .setDescription("When user reaches this amount of warnings...")
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName('action')
            .setDescription("Perform this step when the user reaches the warns")
            .setChoices(
                {name: "Temp mute user", value: "mute"},
                {name: "Kick user", value: "kick"},
                {name: "Shadowban user", value: "shadowban"},
                {name: "Ban user", value: "ban"},
            )
        )
        .addStringOption(option => option
            .setName('duration')
            .setDescription("The duration of the punishment")
            .setRequired(false)
        )
      )
      .addSubcommand(subcommand => 
        subcommand.setName("remove")
        .setDescription("Removes a punishment from the system")
        .addIntegerOption(option => option
            .setName('warning')
            .setDescription("The warning number to remove")
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true)
        )
      )
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    )
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputList(interaction) {
    const reply = await interaction.deferReply();
    const db = await serverSettings.findById(interaction.guild.id).cacheQuery();
    if (db.moderation.system.length == 0) return interaction.followUp(`${this.container.emojis.error} No punishment system was created yet.`);
    const punishments = db.moderation.system.sort((a, b) => a.warnings - b.warnings).map(p => `\` ${p.warnings} \` -> ${(p.duration ? require("ms")(p.duration) : ``)} ${p.punishment}`).join(`\n`);

    const embed = new EmbedBuilder()
    .setDescription(punishments)
    .setColor(Colors.Orange)
    
    await interaction.followUp({ embeds: [embed] });
  }
  async messageList(message) {
    const db = await serverSettings.findById(message.guild.id).cacheQuery();
    if (db.moderation.system.length == 0) return message,reply(`${this.container.emojis.error} No punishment system was created yet.`);
    const punishments = db.moderation.system.sort((a, b) => a.warnings - b.warnings).map(p => `\` ${p.warnings} \` -> ${(p.duration ? require("ms")(p.duration) : ``)} ${p.punishment}`).join(`\n`);

    const embed = new EmbedBuilder()
    .setDescription(punishments)
    .setColor(Colors.Orange)
    
    await message.reply({ embeds: [embed] });
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputAdd(interaction) {
    await interaction.deferReply();
    const db = await serverSettings.findById(interaction.guild.id).cacheQuery();
    const warnings = interaction.options.getInteger("warnings");
    const punishment = interaction.options.getString("action");
    const rawDuration = interaction.options.getString("duration");
    if (!rawDuration && punishment == "mute") return interaction.followUp(`${this.container.emojis.error} The mute option requires a duration.`);
    let duration = 0;
    if (rawDuration) {
        duration = await require("ms")(interaction.options.getString("duration")) || "lol";
        if(isNaN(duration)) return interaction.followUp(`${this.container.emojis.error} Invalid duration specified.`);
    }
    db.moderation.system.push({ warnings: warnings, punishment: punishment, duration: duration });
    await db.save();
    await interaction.followUp(`${this.container.emojis.success} Added to the system successfully. On ${warnings} warnings, ${punishment} the user (${require("ms")(duration) || 'permanent'}).`);
  }
  async messageAdd(message, args) {
    const db = await serverSettings.findById(message.guild.id).cacheQuery();
    const warnings = await args.pick("integer");
    const punishment = await args.pick("string");
    const rawDuration = await args.pick("string").catch(() => undefined);
    if (!(['warn','mute','kick','shadowban','ban']).find(p => p == punishment)) return message.reply(`${this.container.emojis.error} Invalid punishment.`)
    if (!rawDuration && punishment == "mute") return message.reply(`${this.container.emojis.error} The mute option requires a duration.`);
    let duration = 0;
    if (rawDuration) {
        duration = await require("ms")(rawDuration) || "lol";
        if(isNaN(duration)) return message.reply(`${this.container.emojis.error} Invalid duration specified.`);
    }
    db.moderation.system.push({ warnings: warnings, punishment: punishment, duration: duration });
    await db.save();
    await message.reply(`${this.container.emojis.success} Added to the system successfully. On ${warnings} warnings, ${punishment} the user (${require("ms")(duration) || 'permanent'}).`);
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputRemove(interaction) {
    await interaction.deferReply();
    const db = await serverSettings.findById(interaction.guild.id).cacheQuery();
    const warnings = interaction.options.getInteger("warning");
    if (!db.moderation.system.find(p => p.warnings == warnings)) return interaction.followUp(`${this.container.emojis.error} Punishment not found.`);
    db.moderation.system.splice(db.moderation.system.findIndex(p => p.warnings == warnings), 1);
    await db.save();
    await interaction.followUp(`${this.container.emojis.success} Punishment removed successfully.`);
  }
  async messageRemove(message, args) {
    const db = await serverSettings.findById(message.guild.id).cacheQuery();
    const warnings = await args.pick("integer");
    if (!db.moderation.system.find(p => p.warnings == warnings)) return message.reply(`${this.container.emojis.error} Punishment not found.`);
    db.moderation.system.splice(db.moderation.system.findIndex(p => p.warnings == warnings), 1);
    await db.save();
    await message.reply(`${this.container.emojis.success} Punishment removed successfully.`);
  }
  
}
module.exports = {
  PingCommand,
};
