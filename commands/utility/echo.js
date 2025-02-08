const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits } = require("discord.js");
const ServerSettings = require("../../tools/SettingsSchema");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "echo",
      aliases: ["say"],
      description: "Says a message",
      detailedDescription: {
        usage: "echo <text>",
        examples: ["echo Hello there."],
        args: ["text: The text to say"],
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      suggestedUserPermissions: [PermissionFlagsBits.ManageGuild],
      preconditions: ["module"]
    });
  }

  registerApplicationCommands(registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("echo")
        .setDescription("Says a message")
        .addStringOption((option) =>
          option
            .setName("text")
            .setDescription("Text to say")
            .setRequired(true),
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to send the message in")
            .setRequired(false),
        )
        .setDMPermission(false)
        .setDefaultMemberPermissions(32),
    );
  }

  async chatInputRun(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const msg = await interaction.options.getString("text");
    let channel = await interaction.options.getChannel("channel");
    if (!channel) channel = interaction.channel;

    const db = await ServerSettings.findById(interaction.guild.id).cacheQuery();
    if (!db.logging.commands) return interaction.followUp(`${this.container.emojis.error} In order to use the echo command, you must set a command logging channel first so you'd know who is talking through the bot.`)

    channel.send(
      `${await require("../../tools/textParser").parse(msg, interaction.member)}`,
    );
    interaction.followUp(`${this.container.emojis.success} Successfully sent the message.`);
  }

  async messageRun(message, args) {
    const msg = await args.rest("string");
    const db = await ServerSettings.findById(message.guild.id).cacheQuery();
    if (!db.logging.commands) return message.reply(`${this.container.emojis.error} In order to use the echo command, you must set a command logging channel first so you'd know who is talking through the bot.`)

    message.channel.send(
      `${await require("../../tools/textParser").parse(msg, message.member)}`,
    );
  }
}
module.exports = {
  PingCommand,
};
