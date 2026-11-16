const { Listener, Events } = require("@sapphire/framework");
const UserDB = require("../../tools/UserDB");
const config = require("../../config.json");
const { yieldsToStaging } = require("../../tools/staging");
const { peekSettings } = require("../../tools/guildSettings");
const { buildMessage, contextFrom } = require("../../tools/placeholders");

const { EmbedBuilder, Colors, PermissionFlagsBits } = require("discord.js");

const MAX_MENTIONS_CHECKED = 5;
const MAX_MENTIONS_KEPT = 25;
const MAX_MENTIONS_SHOWN = 10;
const DEFAULT_AFK = "**{{nickname}}** is AFK: {{afkreason}} ({{afksince}})";
const DEFAULT_WELCOME_BACK = "Welcome back {{mention}}! I've cleared your AFK status.";

function sinceText(since) {
  if (!since) return { rich: "a while ago", plain: "a while ago" };
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - Number(since));
  const units = [["day", 86_400], ["hour", 3_600], ["minute", 60]];
  const [unit, size] = units.find(([, s]) => seconds >= s) ?? ["second", 1];
  const count = Math.floor(seconds / size);
  return { rich: `<t:${since}:R>`, plain: `${count} ${unit}${count === 1 ? "" : "s"} ago` };
}

/**
 * "While you were away" for someone who's back: where they were mentioned in this
 * server, with links. Mentions in other servers are only counted, not shown here.
 */
function mentionsEmbed(mentions, guildId) {
  const here = mentions.filter((m) => m.guildId === guildId);
  const elsewhere = mentions.length - here.length;
  if (!here.length && !elsewhere) return null;
  const lines = here.slice(-MAX_MENTIONS_SHOWN).reverse().map((m) =>
    `<@${m.authorId}> in <#${m.channelId}> <t:${m.at}:R> · [Jump](https://discord.com/channels/${m.guildId}/${m.channelId}/${m.messageId})`);
  if (here.length > MAX_MENTIONS_SHOWN) lines.push(`…and ${here.length - MAX_MENTIONS_SHOWN} more`);
  if (elsewhere) lines.push(`-# You were also mentioned ${elsewhere} time${elsewhere === 1 ? "" : "s"} in other servers.`);
  return new EmbedBuilder()
    .setTitle(`You were mentioned ${here.length} time${here.length === 1 ? "" : "s"} while you were away`)
    .setDescription(lines.join("\n"))
    .setColor(Colors.Orange)
    .toJSON();
}

// Tells people when someone they mention is AFK, and clears your own AFK status
// when you talk again. What it says is set per server on the dashboard (AFK page).
class AfkCheck extends Listener {
  constructor(context, options) {
    super(context, { ...options, name: "messageCreateAfkCheck", event: Events.MessageCreate });
  }

  /** @param {import("discord.js").Message} message */
  async run(message) {
    if (message.author.bot || !message.inGuild() || !message.member) return;
    if (!config.userdb.global && !config.userdb.afkEnabled) return;
    if (await yieldsToStaging(message.guild)) return;
    const settings = await peekSettings(message.guildId);
    const afk = settings?.afk ?? {};

    // Don't clear an AFK status with the very command that sets it.
    const prefix = await this.container.client.fetchPrefix(message);
    const prefixes = Array.isArray(prefix) ? prefix : [prefix];
    const isCommand = prefixes.some((p) => p && message.content.startsWith(p));

    if (!isCommand) {
      const own = await UserDB.findById(message.author.id).select("afk").lean().cacheQuery();
      if (own?.afk?.since) {
        // Saved through the document so the query cache is cleared.
        const doc = await UserDB.findById(message.author.id);
        const mentions = doc.afk?.mentions?.map((m) => (typeof m.toObject === "function" ? m.toObject() : m)) ?? [];
        doc.afk = { since: null, status: null, mentions: [] };
        const saved = await doc.save().then(() => true, () => false);
        const missed = saved && afk.showMentions !== false ? mentionsEmbed(mentions, message.guildId) : null;
        if (saved && (afk.welcomeBack !== false || missed)) {
          const payload = afk.welcomeBack !== false
            ? buildMessage(settings, { content: afk.welcomeBackMessage || DEFAULT_WELCOME_BACK }, contextFrom({
              member: message.member,
              channel: message.channel,
              extra: { afkreason: own.afk.status ?? "", afksince: sinceText(own.afk.since) },
            })) ?? {}
            : {};
          if (missed) payload.embeds = [...(payload.embeds ?? []), missed].slice(0, 10);
          if (payload.content || payload.embeds?.length) {
            await message.reply({ ...payload, allowedMentions: { users: [message.author.id], repliedUser: false } }).catch(() => undefined);
          }
        }
      }
    }

    const mentioned = [...message.mentions.members.values()]
      .filter((m) => m.id !== message.author.id && !m.user.bot)
      .slice(0, MAX_MENTIONS_CHECKED);
    if (mentioned.length === 0) return;

    const away = await UserDB.find({ _id: { $in: mentioned.map((m) => m.id) }, "afk.status": { $ne: null } })
      .select("afk.status afk.since")
      .lean();
    if (!away.length) return;

    // Remember where they were mentioned, to show them when they're back. The list is
    // posted where they come back, so only mentions in channels everyone can see.
    const everyone = message.guild.roles?.everyone;
    const isPublic = everyone ? message.channel.permissionsFor?.(everyone)?.has(PermissionFlagsBits.ViewChannel) !== false : false;
    const mention = { guildId: message.guildId, channelId: message.channelId, messageId: message.id, authorId: message.author.id, at: Math.floor(message.createdTimestamp / 1000) };
    if (isPublic) {
      await UserDB.updateMany(
        { _id: { $in: away.map((a) => a._id) }, "afk.status": { $ne: null } },
        { $push: { "afk.mentions": { $each: [mention], $slice: -MAX_MENTIONS_KEPT } } },
      ).catch(() => undefined);
    }

    if (afk.enabled === false) return;
    // An embed that was deleted falls back to the default text, so notices don't go quiet.
    const embed = afk.embed && (settings?.embeds ?? []).some((e) => e.name === afk.embed) ? afk.embed : null;
    for (const entry of away) {
      if (!entry.afk?.status) continue;
      const member = mentioned.find((m) => m.id === entry._id);
      const payload = buildMessage(settings, { content: afk.message || (embed ? "" : DEFAULT_AFK), embed }, contextFrom({
        member,
        channel: message.channel,
        extra: { afkreason: entry.afk.status, afksince: sinceText(entry.afk.since) },
      }));
      if (!payload) continue;
      // Telling people someone is AFK shouldn't ping them.
      await message.reply({ ...payload, allowedMentions: { parse: [], repliedUser: false } }).catch(() => undefined);
    }
  }
}

module.exports = { AfkCheck };
