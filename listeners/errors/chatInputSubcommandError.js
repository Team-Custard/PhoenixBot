const { Listener } = require("@sapphire/framework");
const { report, userErrorMessage, replyToInteraction } = require("../../tools/errorReporter");

class ChatInputSubcommandError extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "chatInputSubcommandError" });
  }

  async run(error, { interaction }) {
    report(`Error occured while running the slash subcommand ${interaction.commandName}`, error);
    return replyToInteraction(interaction, userErrorMessage(error));
  }
}
module.exports = { ChatInputSubcommandError };
