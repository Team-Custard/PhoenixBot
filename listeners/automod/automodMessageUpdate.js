const { Listener, Events } = require("@sapphire/framework");
const { runAutomod } = require("../../tools/automodRun");

// Edits get the content filters too, so a message can't be edited into a slur or
// an invite after it was sent.
class AutomodMessageUpdate extends Listener {
  constructor(context, options) {
    super(context, { ...options, name: "automodMessageUpdate", event: Events.MessageUpdate });
  }

  async run(oldMessage, newMessage) {
    if (newMessage.partial) newMessage = await newMessage.fetch().catch(() => null);
    if (!newMessage || oldMessage.content === newMessage.content) return;
    await runAutomod(newMessage, { edited: true }).catch((err) => console.error("[automod] Edit check failed", err));
  }
}

module.exports = { AutomodMessageUpdate };
