const { Command } = require("@sapphire/framework");
const { BucketScope } = require("@sapphire/framework");
const bent = require("bent");
const { PermissionFlagsBits } = require("discord.js");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "meme",
      aliases: [],
      description: "Displays a random meme from reddit.",
      detailedDescription: {
        usage: "meme",
        examples: ["meme"],
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
    const getStream = await bent("https://meme-api.com");
    const stream = await getStream("/gimme");

    if (stream.statusCode != 200) return message.reply(`${this.container.emojis.error} ${stream.status}`);

    const obj = await stream.json();

    if (obj.nsfw == true && !message.channel.nsfw) {
      return message.reply(
        `Refusing to send the scraped reddit post because the post is nsfw.`,
      );
    }
    await message.reply({
      content: `${obj.title} | ${obj.subreddit} | [Post link](<${obj.postLink}>)`,
      files: [obj.url],
    });
  }
}
module.exports = {
  PingCommand,
};
