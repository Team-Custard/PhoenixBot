const { Command } = require("@sapphire/framework");
const { BucketScope } = require("@sapphire/framework");
const bent = require("bent");
const { PermissionFlagsBits } = require("discord.js");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "dog",
      aliases: [],
      description: "Displays a random dog picture from dog.ceo.",
      detailedDescription: {
        usage: "cat",
        examples: ["dog"],
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
    const getStream = await bent("https://dog.ceo");
    const stream = await getStream("/api/breeds/image/random");

    if (stream.statusCode != 200) return message.reply(`${this.container.emojis.error} ${stream.status}`);

    const obj = await stream.json();

    await message.reply({ files: [obj.message] });
  }
}
module.exports = {
  PingCommand,
};
