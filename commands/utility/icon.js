const { Command } = require("@sapphire/framework");
const { BucketScope } = require("@sapphire/framework");
const { PermissionFlagsBits } = require("discord.js");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "icon",
      aliases: ['servericon'],
      description: "Displays the server icon",
      detailedDescription: {
        usage: "icon",
        examples: ["icon"],
        args: [],
      },
      cooldownDelay: 60_000,
      cooldownLimit: 10,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AttachFiles,
      ],
      preconditions: ["module"]
    });
  }

  async messageRun(message) {
    const avatar = message.guild.iconURL({ dynamic: true, size: 1024 });

    await message.reply({
      files: [avatar],
    });
  }
}
module.exports = {
  PingCommand,
};
