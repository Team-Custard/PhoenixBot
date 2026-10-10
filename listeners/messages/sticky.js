const { Listener, Events } = require("@sapphire/framework");
const { peekSettings } = require("../../tools/guildSettings");
const { yieldsToStaging } = require("../../tools/staging");
const { buildMessage, contextFrom } = require("../../tools/placeholders");
const { send } = require("../../tools/queue");
const StickyState = require("../../tools/models/StickyState");
const { rememberOwnDelete } = require("../../tools/ownDeletes");

const MIN_COOLDOWN = 5_000;
// channel id -> { lastPostedAt, timer, messageId, posting }
const channels = new Map();

// Sticky messages: keeps a message at the bottom of a channel. When people talk,
// Phoenix deletes its old copy and posts it again, at most once per cooldown.
class StickyMessages extends Listener {
  constructor(context, options) {
    super(context, { ...options, name: "stickyMessages", event: Events.MessageCreate });
  }

  /** @param {import("discord.js").Message} message */
  async run(message) {
    // Only people count as activity: not Phoenix itself (including the sticky), other
    // bots or webhooks, which could otherwise keep reposting each other forever.
    if (!message.inGuild() || message.system || message.author.bot || message.webhookId) return;
    const settings = await peekSettings(message.guildId);
    const sticky = settings?.stickyMessages?.find((s) => s.channel === message.channelId && s.enabled !== false);
    if (!sticky) return;
    if (await yieldsToStaging(message.guild)) return;

    const cooldown = Math.max(MIN_COOLDOWN, sticky.cooldown ?? 15_000);
    const state = channels.get(message.channelId) ?? { lastPostedAt: 0 };
    channels.set(message.channelId, state);
    // a repost is already coming
    if (state.timer || state.posting) return;
    const wait = Math.max(0, state.lastPostedAt + cooldown - Date.now());
    // Wait at least a moment, so a quick burst of messages leads to one repost.
    state.timer = setTimeout(() => {
      state.timer = null;
      repost(message.channel, message.guildId, state).catch((err) => console.error("[sticky] Repost failed", err?.message ?? err));
    }, Math.max(wait, 1_500));
  }
}

async function repost(channel, guildId, state) {
  state.posting = true;
  try {
    // Read the settings again: the sticky may have been changed or removed meanwhile.
    const settings = await peekSettings(guildId);
    const sticky = settings?.stickyMessages?.find((s) => s.channel === channel.id && s.enabled !== false);
    if (!sticky) return;
    const payload = buildMessage(settings, sticky, contextFrom({ guild: channel.guild, channel }));
    if (!payload) return;

    // Saved per bot, in case two copies of Phoenix share a database.
    const stateId = `${channel.client.user.id}:${channel.id}`;
    if (!state.messageId) state.messageId = (await StickyState.findById(stateId).lean())?.messageId ?? null;
    if (state.messageId) rememberOwnDelete(state.messageId);
    if (state.messageId) await channel.messages.delete(state.messageId).catch(() => undefined);

    const sent = await send(channel, { ...payload, allowedMentions: { parse: [] } });
    state.lastPostedAt = Date.now();
    if (sent) {
      state.messageId = sent.id;
      await StickyState.updateOne({ _id: stateId }, { $set: { guildId, messageId: sent.id } }, { upsert: true });
    }
  }
  finally {
    state.posting = false;
  }
}

module.exports = { StickyMessages };
