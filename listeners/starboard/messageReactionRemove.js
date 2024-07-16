const { isGuildBasedChannel } = require("@sapphire/discord.js-utilities");
const { Listener } = require("@sapphire/framework");
const ServerSettings = require("../../tools/SettingsSchema");
const { EmbedBuilder, Colors } = require("discord.js");

// Module made possible with this script below.
// https://github.com/AnIdiotsGuide/discordjs-bot-guide/blob/master/coding-guides/making-your-own-starboard.md
function extension(attachment) {
  const imageLink = attachment.split(".");
  const typeOfImage = imageLink[imageLink.length - 1];
  const image = /(jpg|jpeg|png|gif)/gi.test(typeOfImage);
  if (!image) return null;
  return attachment;
}

class ReadyListener extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "messageReactionRemove",
    });
  }
  async run(reaction, user) {
    if (reaction.partial) reaction = await reaction.fetch();
    let message = reaction.message;
    if (message.partial) message = await message.fetch();
    if (!isGuildBasedChannel(message.channel)) return;
    if (user.bot) return;

    const db = await ServerSettings.findById(message.guild.id).cacheQuery();
    if (!db) return;
    if (!db.starboard.channel) return console.log(`No starboard channel set`);
    console.log(`${reaction.emoji} - ${db.starboard.emoji}`);
    if (reaction.emoji.toString() != db.starboard.emoji)
      return console.log(`Reactions don't match`);
    if (message.author.id == user.id && db.starboard.selfstar == false)
      return reaction.users.remove(user);
    console.log(`passed`);
    const channel = await message.guild.channels
      .fetch(db.starboard.channel)
      .catch(() => undefined);
    if (!channel) return console.log(`Unable to find the starboard channel`);

    const fetchedMsg = await channel.messages.fetch({ limit: 100 });
    const stars = fetchedMsg.find(
      (m) =>
        m.content.startsWith(db.starboard.emoji) &&
        m.content.endsWith(message.id),
    );
    if (stars) {
      if (reaction.count < db.starboard.threshold) {
        const lastFetch = await channel.messages.fetch(stars.id);
        return lastFetch.delete();
      }
      // const starRegex = new RegExp("/^\\"+db.starboard.emoji+"\\s([0-9]{1,3})\\s\|\\s([0-9]{17,20})/");
      // const star = starRegex.exec(stars.content);
      const image =
        message.attachments.size > 0
          ? await extension(message.attachments.at(0).url)
          : null;
      const embed = new EmbedBuilder()
        .setAuthor({
          name: message.author.tag,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .setDescription(message.content ? message.content : `(No content)`)
        .setImage(image)
        .setColor(message.member.roles.highest.color)
        .setTimestamp(new Date());
      const lastFetch = await channel.messages.fetch(stars.id);
      if (reaction.count >= db.starboard.threshold)
        lastFetch
          .edit({
            content: `${db.starboard.emoji} ${reaction.count} • ${message.url} • ${message.id}`,
            embeds: [embed],
          })
          .catch(() => undefined);
      else lastFetch.delete().catch(() => undefined);
    }
  }
}
module.exports = {
  ReadyListener,
};
