const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");

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
      requiredUserPermissions: [PermissionFlagsBits.ManageChannels],
      flags: true,
    });
  }

  async messageRun(message, args) {
    const find = args.getFlags("find", "f");
    const user = await args.pick("user");

    const url = `https://serpapi.com/search.json?engine=google_reverse_image&image_url=${user.displayAvatarURL({ dynamic: true, size: 1024 })}&api_key=${process.env["serpapikey"]}`;

    if (!find) {
      return message.reply({
        content:
          `Search **${user.username}**'s avatar.\n[\`[Google]\`](<https://lens.google.com/uploadbyurl?url=${user.displayAvatarURL({ size: 2048, dynamic: true })}>) ` +
          `[\`[TinEye]\`](<https://www.tineye.com/search/?&url=${user.displayAvatarURL({ size: 2048, dynamic: true })}>) ` +
          `[\`[Bing]\`](<https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:${user.displayAvatarURL({ size: 2048, dynamic: true })}>)`,
      });
    }

    fetch(url, {
      method: "GET",
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error(`http ${response.status} ${response.statusText}`);
        }
      })
      .then((data) => {
        if (!data.image_results)
          return message.reply(`:x: No similar profile pictures found.`);
        const othermatches = data.image_results.map(
          (d) => `[[${d.position}]](<${d.link}>)`,
        );
        message.reply(
          `Rav has found ${othermatches.length} possible matches for ${user.username}. They will be listed below. Alternative you can use the --links flag to send links to search it instead.\n**First match:** ${data.image_results[0].link}\n**All matches:** ${othermatches}`,
        );
      })
      .catch((error) => message.reply(`:x: ${error}`));
  }
}
module.exports = {
  PingCommand,
};
