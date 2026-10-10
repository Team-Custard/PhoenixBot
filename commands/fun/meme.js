const { PermissionFlagsBits } = require("discord.js");
const { BucketScope } = require("@sapphire/framework");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");
const { getJson } = require("../../tools/http");

class MemeCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "meme",
      description: "Sends a random meme from Reddit.",
      slash: { group: "utilities" },
      guildOnly: false,
      cooldownDelay: 60_000,
      cooldownLimit: 10,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
      preconditions: ["module"],
    });
  }

  async run(ctx) {
    await ctx.defer();
    const meme = await getJson("https://meme-api.com/gimme");
    if (meme.nsfw && !ctx.channel?.nsfw) {
      return ctx.reply(`${emoji("warning")} The fetched post was marked as nsfw, thus I will not send it here.`);
    }
    return ctx.reply({
      content: `${meme.title} | ${meme.subreddit} | [Post link](<${meme.postLink}>)`,
      files: [meme.url],
    });
  }
}

module.exports = { MemeCommand };
