const { Command } = require("@sapphire/framework");
const { Colors } = require("discord.js");
const { PermissionFlagsBits } = require("discord.js");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "cctest",
      aliases: ["testcustom"],
      description:
        "Tests custom commands, also known as tagsv2. This command can only be ran by the bot developer.",
      detailedDescription: {
        usage: "cctest <code>",
        examples: ["cctest ${nsfw} ${exec|ban}"],
        args: ["code: The code to run"]
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ["devCommand"],
      flags: true,
    });
  }

  async messageRun(message, args) {
    const commands = await args.rest('string');
    require("../../tools/tagsv2").exec(commands, message, args, "cc");
  }
}
module.exports = {
  PingCommand,
};
