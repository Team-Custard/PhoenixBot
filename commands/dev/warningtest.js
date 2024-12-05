const {
  Command,
  CommandStore,
  ListenerStore,
  PreconditionStore,
  InteractionHandlerStore,
} = require("@sapphire/framework");
const { Colors } = require("discord.js");
const { PermissionFlagsBits } = require("discord.js");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "warningtest",
      aliases: ["warntest"],
      description: "Test bot warning messages.",
      detailedDescription: {
        usage: "warningtest",
        examples: ["warningtest"],
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ["devCommand"],
    });
  }

  async messageRun(message) {
    const accepted = await require(`../../tools/warningEmbed`).warnMessage(
      message,
      `This is a test of the warning command. This is used to help the user decide if they actually want to execute a potentially dangerous command like purging a chat, deleting a module setting, and performing mass-moderation commands on multiple people.`,
    );
    if (!accepted) return;
    message.reply(`You accepted the prompt. Yayyy!`);
  }
}
module.exports = {
  PingCommand,
};
