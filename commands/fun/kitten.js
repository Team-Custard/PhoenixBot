const { Command } = require("@sapphire/framework");
const { BucketScope } = require("@sapphire/framework");
const bent = require("bent");
const { PermissionFlagsBits } = require("discord.js");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "kitten",
      aliases: ["babycat", "kitty"],
      description: "Displays a random kitten picture from cataas.",
      detailedDescription: {
        usage: "kitten",
        examples: ["kitten"],
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
    const getStream = await bent("https://cataas.com");
    const stream = await getStream("/cat/kitten");

    if (stream.statusCode != 200) return message.reply(`${this.container.emojis.error} ${stream.status}`);

    await message.reply({ files: [stream] });
  }
}
module.exports = {
  PingCommand,
};
