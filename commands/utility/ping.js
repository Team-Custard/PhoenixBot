const { isMessageInstance } = require("@sapphire/discord.js-utilities");
const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits } = require("discord.js");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "ping",
      aliases: ["latency"],
      description: "Fetches the bot ping",
      detailedDescription: {
        usage: "ping",
        examples: ["ping"],
        args: ["No args needed."],
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
    });
  }

  registerApplicationCommands(registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("ping").setDescription("Ping bot to see if it is alive"),
    );
  }

  async chatInputRun(interaction) {
    const msg = await interaction.reply({
      content: `Pinging... Please wait`,
      ephemeral: true,
      fetchReply: true,
    });

    if (isMessageInstance(msg)) {
      const diff = msg.createdTimestamp - interaction.createdTimestamp;
      const ping = Math.round(this.container.client.ws.ping);
      return interaction.editReply(
        `🏓 Pong! (Round trip took: ${diff}ms. Heartbeat: ${ping}ms.)`,
      );
    }

    return interaction.editReply("Failed to retrieve ping :(");
  }

  async messageRun(message) {
    const msg = await message.reply("Pinging... Please wait");

    const diff = msg.createdTimestamp - message.createdTimestamp;
    const ping = Math.round(this.container.client.ws.ping);

    return msg.edit(
      `🏓 Pong! (Round trip took: ${diff}ms. Heartbeat: ${ping}ms.)`,
    );
  }
}
module.exports = {
  PingCommand,
};
