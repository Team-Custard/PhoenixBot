const { Command } = require("@sapphire/framework");
const { BucketScope } = require("@sapphire/framework");
const { PermissionFlagsBits } = require("discord.js");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "banner",
      aliases: [],
      description: "Displays a user's banner.",
      detailedDescription: {
        usage: "banner [user]",
        examples: ["banner 763631377152999435"],
        args: ["user: The user to use."],
      },
      cooldownDelay: 60_000,
      cooldownLimit: 3,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AttachFiles,
      ],
      preconditions: ["module"]
    });
  }

  async messageRun(message, args) {
    let user = await args.pick("user").catch(() => undefined);
    if (!user) user = message.author;
    user.fetch({ force: true }).catch(() => undefined);
    const banner = user.bannerURL({ dynamic: true, size: 1024 });
    console.log(banner);
    if (!banner) return message.reply({ content: `${this.container.emojis.error} This user currently does not have a banner set.` });

    await message.reply({
      files: [banner],
    });
  }
}
module.exports = {
  PingCommand,
};
