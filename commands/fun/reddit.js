const { Command } = require("@sapphire/framework");
const { BucketScope } = require("@sapphire/framework");
const { getPost } = require('../../tools/redditUtils');
const { PermissionFlagsBits, EmbedBuilder, Colors } = require("discord.js");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "reddit",
      aliases: [],
      description: "Displays a post from a subreddit you specify. Note that posts marked nsfw will not display outside of nsfw channels.",
      detailedDescription: {
        usage: "reddit <subreddit>",
        examples: ["reddit r/tihi"],
        args: ['subreddit: The subreddit to use']
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

  async messageRun(message, args) {
    let sub = await args.pick('string');
    sub = sub.replace('r/', '');
    const post = await getPost(sub);

    if (!post) return message.reply(`${this.container.emojis.error} I could not find any posts. Either the subreddit doesn't exist or I have been blocked from Reddit's api.`)

    if (post.over_18 && !message.channel.nsfw) return message.reply(`${this.container.emojis.warning} The fetched post was marked as nsfw, thus I will not send it here.`);

    const embed = new EmbedBuilder()
    .setTitle(post.title+(post.archived ? ' 🔒':''))
    .setURL(`https://reddit.com${post.permalink}`)
    .setFields([
        { name: 'Author', value: `[u/${post.author}](https://reddit.com/u/${post.author})`, inline: true },
        { name: 'Upvotes', value: `⬆️ ${post.ups} ⬇️ ${post.downs}`, inline: true }
    ])
    .setDescription(post.selftext.substring(0,2000) || `(No description)`)
    .setColor(Colors.Orange)
    .setImage(post.url || null)
    .setFooter({ text: `ID: ${post.id}` })
    .setTimestamp(Math.floor(post.created_utc * 1000));

    await message.reply({ embeds: [embed] });
  }
}
module.exports = {
  PingCommand,
};
