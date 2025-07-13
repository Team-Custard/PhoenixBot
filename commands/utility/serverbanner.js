const { Command } = require("@sapphire/framework");
const { BucketScope } = require("@sapphire/framework");
const { PermissionFlagsBits } = require("discord.js");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "serverbanner",
      aliases: ['sbanner', 'guildbanner'],
      description: "Displays the server banner",
      detailedDescription: {
        usage: "serverbanner",
        examples: ["serverbanner"],
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
    if (!message.guild.banner) return message.reply({ content: `${this.container.emojis.error} This server currently does not have a banner set.` });

    const banner = message.guild.bannerURL({ dynamic: true, size: 1024 });

    await message.reply({
      files: [banner],
    });
  }
}
module.exports = {
  PingCommand,
};
