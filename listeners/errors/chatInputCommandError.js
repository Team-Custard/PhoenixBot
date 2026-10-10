const { Listener } = require("@sapphire/framework");
const { report, userErrorMessage, replyToInteraction } = require("../../tools/errorReporter");

class ChatInputCommandError extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "chatInputCommandError" });
  }

  async run(error, { interaction }) {
    report(`Error occured while running the slash command ${interaction.commandName}`, error);
    return replyToInteraction(interaction, userErrorMessage(error));
  }
}
module.exports = { ChatInputCommandError };
