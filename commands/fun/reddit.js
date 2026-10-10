const { PermissionFlagsBits, EmbedBuilder, Colors } = require("discord.js");
const { BucketScope } = require("@sapphire/framework");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");
const { getPost } = require("../../tools/redditUtils");

class RedditCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "reddit",
      description: "Shows a post from a subreddit. NSFW posts only show in NSFW channels.",
      examples: ["reddit aww", "reddit r/foxes"],
      args: [{ name: "subreddit", type: "string", required: true, maxLength: 50, description: "The subreddit, e.g. aww" }],
      slash: { group: "utilities" },
      guildOnly: false,
      cooldownDelay: 60_000,
      cooldownLimit: 10,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
      preconditions: ["module"],
    });
  }

  async run(ctx, { subreddit }) {
    await ctx.defer();
    const post = await getPost(subreddit.replace(/^\/?r\//i, "")).catch(() => undefined);
    if (!post) {
      return ctx.reply(`${emoji("error")} I could not find any posts. Either the subreddit doesn't exist or I have been blocked from Reddit's api.`);
    }
    if (post.over_18 && !ctx.channel?.nsfw) {
      return ctx.reply(`${emoji("warning")} The fetched post was marked as nsfw, thus I will not send it here.`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`${post.title}${post.archived ? " 🔒" : ""}`.slice(0, 256))
      .setURL(`https://reddit.com${post.permalink}`)
      .setFields(
        { name: "Author", value: `[u/${post.author}](https://reddit.com/u/${post.author})`, inline: true },
        { name: "Upvotes", value: `⬆️ ${post.ups} ⬇️ ${post.downs}`, inline: true },
      )
      .setDescription(post.selftext?.substring(0, 2000) || "(No description)")
      .setColor(Colors.Orange)
      .setImage(post.url?.startsWith("https://i.redd.it") ? post.url : null)
      .setFooter({ text: `ID: ${post.id}` })
      .setTimestamp(Math.floor(post.created_utc * 1000));

    if (post.url?.startsWith("https://v.redd.it")) {
      embed.addFields({ name: "** **", value: `**[🎥 This is a video! Press to play video.](${post.url})**` });
    }
    if (post.url?.startsWith("https://www.reddit.com/gallery") && post.gallery_data?.items?.length) {
      const mediaId = post.gallery_data.items[0].media_id;
      embed.addFields({ name: "** **", value: `**[🖼️ This is a gallery! Press to view full gallery.](${post.url})**` });
      const mime = post.media_metadata?.[mediaId]?.m;
      if (mime) embed.setImage(`https://i.redd.it/${mediaId}.${mime.split("/")[1]}`);
    }

    return ctx.reply({ embeds: [embed] });
  }
}

module.exports = { RedditCommand };
