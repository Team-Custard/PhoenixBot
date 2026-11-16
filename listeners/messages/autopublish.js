const { Listener, Events } = require("@sapphire/framework");
const { ChannelType, MessageFlags } = require("discord.js");
const { peekSettings } = require("../../tools/guildSettings");
const { yieldsToStaging } = require("../../tools/staging");

// Autopublish (dashboard): new messages in the picked announcement channels are
// published, so they reach every server following the channel.

// Discord allows 10 published messages per channel per hour. Past that, discord.js
// would wait out the limit and publish late, so Phoenix counts and skips instead.
const PER_HOUR = 10;
const recent = new Map();
function underLimit(channelId, now = Date.now()) {
  const times = (recent.get(channelId) ?? []).filter((t) => now - t < 3_600_000);
  if (times.length >= PER_HOUR) {
    recent.set(channelId, times);
    return false;
  }
  times.push(now);
  recent.set(channelId, times);
  if (recent.size > 5_000) recent.delete(recent.keys().next().value);
  return true;
}
class Autopublish extends Listener {
  constructor(context, options) {
    super(context, { ...options, name: "autopublish", event: Events.MessageCreate });
  }

  /** @param {import("discord.js").Message} message */
  async run(message) {
    if (!message.inGuild() || message.channel.type !== ChannelType.GuildAnnouncement) return;
    // Already published, or a message that can't be (system messages, ones from other servers).
    if (message.system || message.flags.has(MessageFlags.Crossposted) || message.flags.has(MessageFlags.IsCrosspost)) return;
    const settings = await peekSettings(message.guildId);
    const cfg = settings?.autopublish;
    if (!cfg?.channels?.includes(message.channelId)) return;
    if ((message.author.bot || message.webhookId) && cfg.includeBots === false) return;
    if (await yieldsToStaging(message.guild)) return;
    if (!underLimit(message.channelId)) return;
    await message.crosspost().catch(() => undefined);
  }
}

module.exports = { Autopublish };
