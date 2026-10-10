const { Listener, Events } = require("@sapphire/framework");
const { peekSettings } = require("../../tools/guildSettings");

// Runs a server's custom commands (stored in settings.cc) when an unknown prefix
// command matches one of them.
class CustomCommandHandler extends Listener {
  constructor(context, options) {
    super(context, { ...options, name: "customCommandHandler", event: Events.UnknownMessageCommand });
  }

  async run({ message, prefix, commandName }) {
    if (message.author.bot || !message.inGuild()) return;

    const settings = await peekSettings(message.guildId);
    const command = settings?.cc?.find((c) => c.name === commandName);
    if (!command) return;

    const prefixLength = typeof prefix === "string" ? prefix.length : 0;
    const rawArgs = message.content.slice(prefixLength + commandName.length).trim();
    await require("../../tools/tagsv2").exec(command.code, message, { rest: async () => rawArgs }, "cc");
  }
}

module.exports = { CustomCommandHandler };
