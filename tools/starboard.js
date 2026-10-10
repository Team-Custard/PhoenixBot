const { EmbedBuilder, Colors } = require("discord.js");
const { peekSettings } = require("./guildSettings");

// original message id -> starboard message id. Saves fetching the last 100
// starboard messages on every star.
const posted = new Map();
const MAX_TRACKED = 5_000;

const IMAGE = /\.(jpe?g|png|gif|webp)(\?|$)/i;

function starEmbed(message) {
  const image = message.attachments.find((a) => IMAGE.test(a.url) || a.contentType?.startsWith("image/"));
  return new EmbedBuilder()
    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
    .setDescription(message.content ? message.content.slice(0, 4096) : "(No content)")
    .setImage(image?.url ?? null)
    .setColor(Colors.Orange)
    .setTimestamp(new Date());
}

async function findStarMessage(channel, settings, messageId) {
  const knownId = posted.get(messageId);
  if (knownId) {
    const known = await channel.messages.fetch(knownId).catch(() => null);
    if (known) return known;
    posted.delete(messageId);
  }
  const recent = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  return recent?.find((m) => m.content.startsWith(settings.starboard.emoji) && m.content.endsWith(messageId)) ?? null;
}

function remember(messageId, starMessageId) {
  if (posted.size > MAX_TRACKED) posted.delete(posted.keys().next().value);
  posted.set(messageId, starMessageId);
}

/**
 * Adds, updates or removes a message's starboard entry after a reaction changes.
 * @param {import("discord.js").MessageReaction} reaction
 * @param {import("discord.js").User} user
 * @param {boolean} added
 */
async function handleStarReaction(reaction, user, added) {
  if (user.bot) return;
  const guild = reaction.message.guild;
  if (!guild) return;

  // Settings and emoji are checked before fetching anything from Discord.
  const settings = await peekSettings(guild.id);
  const starboard = settings?.starboard;
  if (!starboard?.channel || !starboard.emoji) return;
  if (reaction.emoji.toString() !== starboard.emoji && reaction.emoji.name !== starboard.emoji) return;

  if (reaction.partial) reaction = await reaction.fetch().catch(() => null);
  if (!reaction) return;
  const message = reaction.message.partial ? await reaction.message.fetch().catch(() => null) : reaction.message;
  if (!message || message.channelId === starboard.channel) return;

  if (added && message.author.id === user.id && starboard.selfstar === false) {
    await reaction.users.remove(user).catch(() => undefined);
    return;
  }

  const channel = await guild.channels.fetch(starboard.channel).catch(() => null);
  if (!channel) return;

  const threshold = Number(starboard.threshold) || 1;
  const existing = await findStarMessage(channel, settings, message.id);
  const content = `${starboard.emoji} ${reaction.count} • ${message.url} • ${message.id}`;

  if (reaction.count < threshold) {
    if (existing) {
      posted.delete(message.id);
      await existing.delete().catch(() => undefined);
    }
    return;
  }
  if (existing) {
    await existing.edit({ content, embeds: [starEmbed(message)] }).catch(() => undefined);
    return;
  }
  const sent = await channel.send({ content, embeds: [starEmbed(message)] }).catch(() => null);
  if (sent) remember(message.id, sent.id);
}

module.exports = { handleStarReaction };
