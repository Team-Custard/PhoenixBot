const { Listener, Events } = require("@sapphire/framework");
const { noteActivity } = require("../../tools/timedMessages");

// Remembers when people last talked in each channel, for timed messages that only
// post while a chat is active.
class ChannelActivity extends Listener {
  constructor(context, options) {
    super(context, { ...options, name: "channelActivity", event: Events.MessageCreate });
  }

  run(message) {
    if (!message.inGuild() || message.author.bot || message.webhookId || message.system) return;
    noteActivity(message.channelId, message.createdTimestamp);
  }
}

module.exports = { ChannelActivity };
