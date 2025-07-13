const { Command, BucketScope } = require("@sapphire/framework");
const { PermissionFlagsBits } = require("discord.js");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "ran",
      aliases: [`reversebanner`, `reversean`],
      description:
        "Searches for the source of a user's banner. We call it ran because it sounds cool.",
      detailedDescription: {
        usage: "ran [flags] <user>",
        examples: ["ran @sylveondev", "ran @sylveondev"],
        args: [`user : The user to search`],
        flags: [`--find : Searches for the image instead of sharing links.`],
      },
      cooldownDelay: 60_000,
      cooldownLimit: 3,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [PermissionFlagsBits.AttachFiles],
      preconditions: ["module"]
    });
  }

  async messageRun(message, args) {
    let user = await args.pick("user");
    user = await message.client.users.fetch(user.id, { force: true }).catch(() => undefined);

    return message.reply({
    content:
        `Search **${user.username}**'s banner.\n[\`[Google]\`](<https://lens.google.com/uploadbyurl?url=${user.bannerURL({ size: 2048, dynamic: true })}>) ` +
        `[\`[TinEye]\`](<https://www.tineye.com/search/?&url=${user.bannerURL({ size: 2048, dynamic: true })}>) ` +
        `[\`[Bing]\`](<https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:${user.bannerURL({ size: 2048, dynamic: true })}>)`,
    });
  }
}
module.exports = {
  PingCommand,
};
