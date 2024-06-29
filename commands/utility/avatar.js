const { Command } = require("@sapphire/framework");
const { BucketScope } = require("@sapphire/framework");
const { PermissionFlagsBits } = require("discord.js");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "avatar",
      aliases: ["av"],
      description: "Displays a user's avatar.",
      detailedDescription: {
        usage: "avatar [user]",
        examples: ["avatar 763631377152999435"],
        args: ["user: The user to use."],
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

  async messageRun(message, args) {
    let member = await args.pick("user").catch(() => undefined);
    if (!member) member = message.author;
    const avatar = member.displayAvatarURL({ dynamic: true, size: 1024 });

    await message.reply({
      files: [avatar],
    });
  }
}
module.exports = {
  PingCommand,
};
