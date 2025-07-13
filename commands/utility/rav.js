const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits } = require("discord.js");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "rav",
      aliases: [`reverseavatar`, `reverseav`],
      description:
        "Searches for the source of a user's avatar. We call it rav because it sounds cool.",
      detailedDescription: {
        usage: "rav [flags] <user>",
        examples: ["rav @sylveondev", "rav --link @sylveondev"],
        args: [`user : The user to search`],
        flags: [`--find : Searches for the image instead of sharing links.`],
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.AttachFiles],
      preconditions: ["module"]
    });
  }

  async messageRun(message, args) {
    const user = await args.pick("user");

    return message.reply({
      content:
        `Search **${user.username}**'s avatar.\n[\`[Google]\`](<https://lens.google.com/uploadbyurl?url=${user.displayAvatarURL({ size: 2048, dynamic: true })}>) ` +
        `[\`[TinEye]\`](<https://www.tineye.com/search/?&url=${user.displayAvatarURL({ size: 2048, dynamic: true })}>) ` +
        `[\`[Bing]\`](<https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:${user.displayAvatarURL({ size: 2048, dynamic: true })}>)`,
    });
  }
}
module.exports = {
  PingCommand,
};
