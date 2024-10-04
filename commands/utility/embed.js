const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits, EmbedBuilder, Colors } = require("discord.js");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "embed",
      aliases: ["sendembed"],
      description: "Sends an embed. You can use [https://embed.dan.onl/](this site) to generate embed code.",
      detailedDescription: {
        usage: "embed <json>",
        examples: ["echo Hello there."],
        args: ["text: The text to say"],
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      preconditions: ["module"]
    });
  }

  registerApplicationCommands(registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("embed")
        .setDescription("Sends an embed")
        .addStringOption((option) =>
          option
            .setName("json")
            .setDescription("Embed json")
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
    const embedraw = await interaction.options.getString("json");
    let channel = await interaction.options.getChannel("channel");
    if (!channel) channel = interaction.channel;

    const embed = new EmbedBuilder(await JSON.parse(embedraw))
    .setColor(Colors.Orange);

    channel.send({
        embeds: [embed]
    }).then(() => interaction.followUp(`${this.container.emojis.success} Successfully sent the message.`))
     .catch((e) => interaction.followUp(`${this.container.emojis.error} ${e}`));
  }

  async messageRun(message, args) {
    message.reply(`${this.container.emojis.info} Please use the slash command variant of this command. Embed json doesn't play well with prefix commands.`);
  }
}
module.exports = {
  PingCommand,
};
