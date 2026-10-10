const { Listener } = require("@sapphire/framework");
const { report, userErrorMessage, replyToInteraction } = require("../../tools/errorReporter");

class ContextMenuCommandError extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "contextMenuCommandError" });
  }

  async run(error, { interaction }) {
    report(`Error occured while running the context menu command ${interaction.commandName}`, error);
    return replyToInteraction(interaction, userErrorMessage(error));
  }
}
module.exports = { ContextMenuCommandError };
