const { Subcommand } = require("@sapphire/plugin-subcommands");
const { BucketScope } = require("@sapphire/framework");
const serverSettings = require("../../tools/SettingsSchema");
const { PermissionFlagsBits, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, disableValidators, EmbedBuilder, Colors, Message } = require("discord.js");
class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "plus",
      aliases: [],
      description: "Phoenix plus settings.",
      detailedDescription: {
        usage: "plus [subcommand]",
        examples: [
          "plus info",
          "plus status",
        ],
        args: [
          "subcommand: ",
        ],
      },
      subcommands: [
        {
          name: "info",
          chatInputRun: "chatInputInfo",
          messageRun: "messageInfo",
        },
        {
          name: "status",
          chatInputRun: "chatInputStatus",
          messageRun: "messageStatus",
          default: true,
        },
        {
          name: "test",
          chatInputRun: "chatInputTest",
          messageRun: "messageTest",
          preconditions: ["devCommand"]
        },
      ],
      cooldownDelay: 5_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
    });
  }

  registerApplicationCommands(registry) {
    registry.idHints = ["1227016558778519622"];
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("plus")
        .setDescription("Commands for the phoenix plus subscription")
        .addSubcommand((command) =>
          command.setName("info").setDescription("Displays info about plus"),
        )
        .addSubcommand((command) =>
            command.setName("status").setDescription("Checks if you have plus"),
          )
        .addSubcommand((command) =>
          command.setName("test").setDescription("Toggles testing premium for the server (dev only)"),
        )
        .setDMPermission(false),
    );
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputInfo(interaction) {
    const embed = new EmbedBuilder()
    .setTitle("<:plus:1262930849083559947> Phoenix Plus")
    .setDescription(`Phoenix Plus is a subscription that extends extends limits and functionality of the bot. Phoenix Plus is handled through Discord, and starts at $5 a month. To buy Phoenix Plus or view all the perks, press the button below to get started.`)
    .setColor(Colors.Orange)
    .setThumbnail('https://cdn.discordapp.com/emojis/1262930833770025062.png?size=512')
    .setTimestamp(new Date())

    const actionRow = new ActionRowBuilder().addComponents(new ButtonBuilder()
    .setStyle(ButtonStyle.Premium)
    .setSKUId(require("../../config.json").premiumId));
    interaction.reply({ components: [actionRow], embeds: [embed], ephemeral: true })
  }

  /**
   * @param {Message} message 
   */
  async messageInfo(message) {
    const embed = new EmbedBuilder()
    .setTitle("<:plus:1262930849083559947> Phoenix Plus")
    .setDescription(`Phoenix Plus is a subscription that extends extends limits and functionality of the bot. Phoenix Plus is handled through Discord, and starts at $5 a month. To buy Phoenix Plus or view all the perks, press the button below to get started.`)
    .setColor(Colors.Orange)
    .setThumbnail('https://cdn.discordapp.com/emojis/1262930833770025062.png?size=512')
    .setTimestamp(new Date())

    const actionRow = new ActionRowBuilder().addComponents(new ButtonBuilder()
    .setStyle(ButtonStyle.Premium)
    .setSKUId(require("../../config.json").premiumId));
    message.reply({ components: [actionRow], embeds: [embed], ephemeral: true })
  }

  /**
   * @param {ChatInputCommandInteraction} interaction
   */
  async chatInputStatus(interaction) {
    await interaction.deferReply();
    const entitlements = await this.container.client.application.entitlements.fetch({
      skus: [require("../../config.json").premiumId],
      guild: interaction.guild.id
    });
    if (entitlements?.first()?.guildId != interaction.guildId) return interaction.followUp(`This server does not have Phoenix Plus. Use </plus info:${this.container.client.application.commands.cache.find(c => c.name == "plus").id}> for more info about plus.`);
    interaction.followUp(`This server has Phoenix Plus. You can use all of Phoenix's paid features for the duration of the plan.`)
    // console.log(entitlements);
  }

  /**
   * @param {Message} message
   */
  async messageStatus(message) {
    const entitlements = await this.container.client.application.entitlements.fetch({
      skus: [require("../../config.json").premiumId],
      guild: message.guild.id
    });
    if (entitlements?.first()?.guildId != message.guild.id) return message.reply(`This server does not have Phoenix Plus. Use </plus info:${this.container.client.application.commands.cache.find(c => c.name == "plus").id}> for more info about plus.`);
    message.reply(`This server has Phoenix Plus. You can use all of Phoenix's paid features for the duration of the plan.`)
    // console.log(entitlements);
  }

  /**
   * @param {ChatInputCommandInteraction} interaction 
   */
  async chatInputTest(interaction) {
    await interaction.deferReply();
    const entitlements = await this.container.client.application.entitlements.fetch({
      skus: [require("../../config.json").premiumId],
      guild: interaction.guild.id
    });
    if (entitlements?.first()?.guildId == interaction.guildId) {
      await this.container.client.application.entitlements.deleteTest(entitlements.first())
      .then(() => interaction.followUp(`${this.container.emojis.success} This server is no longer marked as test premium.`))
      .catch((e) => {
        console.error(e);
        interaction.followUp(`${this.container.emojis.error} ${e}`);
      })
    } else {
      await this.container.client.application.entitlements.createTest({
        sku: require("../../config.json").premiumId,
        guild: interaction.guild.id
      }).then(() => interaction.followUp(`${this.container.emojis.success} This server has been marked as test premium.`))
      .catch((e) => {
        console.error(e);
        interaction.followUp(`${this.container.emojis.error} ${e}`);
      })
    }
  }

  /**
   * @param {Message} message 
   */
  async messageTest(message) {
    const entitlements = await this.container.client.application.entitlements.fetch({
      skus: [require("../../config.json").premiumId],
      guild: message.guild.id
    });
    if (entitlements?.first()?.guildId == message.guild.id) {
      await this.container.client.application.entitlements.deleteTest(entitlements.first())
      .then(() => message.reply(`${this.container.emojis.success} This server is no longer marked as test premium.`))
      .catch((e) => {
        console.error(e);
        message.reply(`${this.container.emojis.error} ${e}`);
      })
    } else {
      await this.container.client.application.entitlements.createTest({
        sku: require("../../config.json").premiumId,
        guild: message.guild.id
      }).then(() => message.reply(`${this.container.emojis.success} This server has been marked as test premium.`))
      .catch((e) => {
        console.error(e);
        message.reply(`${this.container.emojis.error} ${e}`);
      })
    }
  }
}
module.exports = {
  PingCommand,
};
