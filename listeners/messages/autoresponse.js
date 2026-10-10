const { Listener, Events } = require("@sapphire/framework");
const { peekSettings } = require("../../tools/guildSettings");
const { yieldsToStaging } = require("../../tools/staging");
const { findMatch, onCooldown } = require("../../tools/autoresponse");
const { buildMessage, contextFrom } = require("../../tools/placeholders");
const { send } = require("../../tools/queue");
const automod = require("../../tools/automod");

function automodWouldRemove(settings, message) {
  const config = settings.automod;
  if (!automod.anyFilterOn(config) || automod.isExempt(config, message.member, message.channel)) return false;
  return Boolean(automod.checkContent(config.filters, {
    content: message.content,
    mentionCount: message.mentions.users.size + message.mentions.roles.size + (message.mentions.everyone ? 1 : 0),
  }, { ownInviteCodes: new Set([message.guild.vanityURLCode].filter(Boolean)) }));
}

// Autoresponses set on the dashboard: reply when a message matches a trigger.
class Autoresponse extends Listener {
  constructor(context, options) {
    super(context, { ...options, name: "autoresponse", event: Events.MessageCreate });
  }

  /** @param {import("discord.js").Message} message */
  async run(message) {
    if (!message.inGuild() || message.author.bot || message.webhookId || message.system || !message.content) return;
    const settings = await peekSettings(message.guildId);
    if (!settings?.autoresponses?.length) return;
    // Don't answer prefix commands.
    if (settings.enablePrefix !== false && settings.prefix && message.content.startsWith(settings.prefix)) return;

    // Not in the honeypot channel, and not to messages automod is about to remove.
    if (settings.automod?.honeypot?.channel === message.channelId) return;
    if (automodWouldRemove(settings, message)) return;

    const found = await findMatch(message.guildId, settings.autoresponses, {
      content: message.content,
      channelId: message.channelId,
      parentId: message.channel.parentId,
    });
    if (!found) return;
    if (onCooldown(`${message.guildId}:${found.index}:${message.channelId}`)) return;
    if (await yieldsToStaging(message.guild)) return;

    const payload = buildMessage(settings, found.entry, contextFrom({ member: message.member, channel: message.channel }));
    if (!payload) return;
    if (found.entry.reply !== false) {
      payload.reply = { messageReference: message.id, failIfNotExists: false };
      payload.allowedMentions = { ...payload.allowedMentions, repliedUser: false };
    }
    await send(message.channel, payload);
  }
}

module.exports = { Autoresponse };
