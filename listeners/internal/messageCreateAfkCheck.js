const { Listener, Events } = require("@sapphire/framework");
const UserDB = require("../../tools/UserDB");
const config = require("../../config.json");
const { yieldsToStaging } = require("../../tools/staging");

const MAX_MENTIONS_CHECKED = 5;

// Tells people when someone they mention is AFK, and clears your own AFK status
// when you talk again.
class AfkCheck extends Listener {
  constructor(context, options) {
    super(context, { ...options, name: "messageCreateAfkCheck", event: Events.MessageCreate });
  }

  /** @param {import("discord.js").Message} message */
  async run(message) {
    if (message.author.bot || !message.inGuild() || !message.member) return;
    if (!config.userdb.global && !config.userdb.afkEnabled) return;
    if (await yieldsToStaging(message.guild)) return;

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
        await doc
          .save()
          .then(() => message.reply(`Welcome back ${message.member}! I have cleared your afk status.`))
          .catch((err) => message.reply(`Welcome back ${message.member}!\nOops! I was unable to clear your afk status though. Error: ${err}`))
          .catch(() => undefined);
      }
    }

    const mentioned = [...message.mentions.members.values()]
      .filter((m) => m.id !== message.author.id && !m.user.bot)
      .slice(0, MAX_MENTIONS_CHECKED);
    if (mentioned.length === 0) return;

    const afk = await UserDB.find({ _id: { $in: mentioned.map((m) => m.id) }, "afk.status": { $ne: null } })
      .select("afk")
      .lean();
    for (const entry of afk) {
      if (!entry.afk?.status) continue;
      const member = mentioned.find((m) => m.id === entry._id);
      await message
        .reply({
          content: `${member.user.username} is afk. \`${entry.afk.status}\`${entry.afk.since ? ` <t:${entry.afk.since}:R>` : ""}`,
          allowedMentions: { parse: [] },
        })
        .catch(() => undefined);
    }
  }
}

module.exports = { AfkCheck };
