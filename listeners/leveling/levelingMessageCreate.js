const { Listener, Events } = require("@sapphire/framework");
const { peekSettings } = require("../../tools/guildSettings");
const { parse } = require("../../tools/textParser");
const { LevelMember, xpForLevel, rewardRoleChanges } = require("../../tools/leveling");
const { yieldsToStaging } = require("../../tools/staging");

const COOLDOWN = 60_000;
const cooldowns = new Map();

const randomXp = (min, max) => Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min);

class LevelingMessageCreate extends Listener {
  constructor(context, options) {
    super(context, { ...options, name: "levelingMessageCreate", event: Events.MessageCreate });
  }

  /** @param {import("discord.js").Message} message */
  async run(message) {
    if (message.author.bot || !message.inGuild() || !message.member) return;

    const key = `${message.guildId}:${message.author.id}`;
    const last = cooldowns.get(key);
    if (last && Date.now() - last < COOLDOWN) return;

    const settings = await peekSettings(message.guildId);
    if (!settings?.leveling?.enable) return;
    if (settings.prefix && message.content.startsWith(settings.prefix)) return;
    if (await yieldsToStaging(message.guild)) return;

    const leveling = settings.leveling;
    if (leveling.blacklistChannels?.includes(message.channelId)) return;
    if (leveling.blacklistRole?.some((id) => message.member.roles.cache.has(id))) return;

    cooldowns.set(key, Date.now());
    if (cooldowns.size > 100_000) pruneCooldowns();

    const xp = randomXp(leveling.rates?.minimum ?? 5, leveling.rates?.maximum ?? 15);
    // One atomic update instead of loading and re-saving the whole settings document.
    let entry = await LevelMember.findOneAndUpdate(
      { guildId: message.guildId, userId: message.author.id },
      { $inc: { xp } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    let leveledUp = false;
    if (entry.xp > xpForLevel(entry.level)) {
      // Matching on the current level makes sure two clusters can't both level them up.
      const updated = await LevelMember.findOneAndUpdate(
        { _id: entry._id, level: entry.level },
        { $set: { xp: 0 }, $inc: { level: 1 } },
        { new: true },
      ).lean();
      if (updated) {
        entry = updated;
        leveledUp = true;
      }
    }

    const changes = rewardRoleChanges(leveling, message.member, entry.level);
    if (changes.add.length) await message.member.roles.add(changes.add, "Level roles").catch(() => undefined);
    if (changes.remove.length) await message.member.roles.remove(changes.remove, "Level roles").catch(() => undefined);

    if (leveledUp && leveling.message && entry.level > 1) {
      const text = await parse(leveling.message, message.member, { level: entry.level });
      const channel = leveling.announceChannel
        ? await message.guild.channels.fetch(leveling.announceChannel).catch(() => null)
        : message.channel;
      await channel?.send(text).catch(() => undefined);
    }
  }
}

function pruneCooldowns() {
  const cutoff = Date.now() - COOLDOWN;
  for (const [key, time] of cooldowns) if (time < cutoff) cooldowns.delete(key);
}

module.exports = { LevelingMessageCreate };
