const { Listener } = require("@sapphire/framework");
const { emoji, replyToInteraction, withServerEmojis } = require("../../tools/errorReporter");

class ChatInputSubcommandDenied extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "chatInputSubcommandDenied" });
  }

  run(error, { interaction }) {
    return withServerEmojis(interaction.guildId, () => replyToInteraction(interaction, `${emoji("error")} ${error}`));
  }
}
module.exports = { ChatInputSubcommandDenied };
