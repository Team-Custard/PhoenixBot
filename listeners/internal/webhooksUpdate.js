const { Listener, Events } = require("@sapphire/framework");
const webhookFetch = require("../../tools/webhookFetch");

// Drop the cached logging webhook when a channel's webhooks change, so a deleted
// webhook is recreated on the next log instead of failing.
class WebhooksUpdateListener extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: Events.WebhooksUpdate });
  }

  run(channel) {
    webhookFetch.invalidate(channel.id);
  }
}
module.exports = { WebhooksUpdateListener };
