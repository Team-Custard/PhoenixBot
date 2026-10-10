const { Listener, Events } = require("@sapphire/framework");
const { runAutomod } = require("../../tools/automodRun");

// Phoenix's message filters (spam, invites, links, blocked words...). Settings are on
// the dashboard's Automod page.
class AutomodMessageCreate extends Listener {
  constructor(context, options) {
    super(context, { ...options, name: "automodMessageCreate", event: Events.MessageCreate });
  }

  async run(message) {
    await runAutomod(message).catch((err) => console.error("[automod] Message check failed", err));
  }
}

module.exports = { AutomodMessageCreate };
