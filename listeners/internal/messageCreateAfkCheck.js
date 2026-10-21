const { Listener, Events } = require("@sapphire/framework");
const UserDB = require("../../tools/UserDB");
const config = require("../../config.json");
const { yieldsToStaging } = require("../../tools/staging");
const { peekSettings } = require("../../tools/guildSettings");
const { buildMessage, contextFrom } = require("../../tools/placeholders");

const MAX_MENTIONS_CHECKED = 5;
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
        doc.afk = { since: null, status: null };
        const saved = await doc.save().then(() => true, () => false);
        if (saved && afk.welcomeBack !== false) {
          const payload = buildMessage(settings, { content: afk.welcomeBackMessage || DEFAULT_WELCOME_BACK }, contextFrom({
            member: message.member,
            channel: message.channel,
            extra: { afkreason: own.afk.status ?? "", afksince: sinceText(own.afk.since) },
          }));
          if (payload) await message.reply({ ...payload, allowedMentions: { users: [message.author.id], repliedUser: false } }).catch(() => undefined);
        }
      }
    }

    if (afk.enabled === false) return;
    const mentioned = [...message.mentions.members.values()]
      .filter((m) => m.id !== message.author.id && !m.user.bot)
      .slice(0, MAX_MENTIONS_CHECKED);
    if (mentioned.length === 0) return;

    const away = await UserDB.find({ _id: { $in: mentioned.map((m) => m.id) }, "afk.status": { $ne: null } })
      .select("afk")
      .lean();
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
