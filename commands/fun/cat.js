const { Command } = require("@sapphire/framework");
const { BucketScope } = require("@sapphire/framework");
const bent = require("bent");
const { PermissionFlagsBits } = require("discord.js");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "cat",
      aliases: [],
      description: "Displays a random cat picture from cataas.",
      detailedDescription: {
        usage: "cat",
        examples: ["cat"],
        args: ["No args needed"],
      },
      cooldownDelay: 60_000,
      cooldownLimit: 10,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AttachFiles,
      ],
    });
  }

  async messageRun(message) {
    const getStream = await bent("https://cataas.com/");
    const stream = await getStream("/cat");

    if (stream.statusCode != 200) return message.reply(`:x: ${stream.status}`);

    await message.reply({ files: [stream] });
  }
}
module.exports = {
  PingCommand,
};
