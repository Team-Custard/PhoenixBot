const { Listener } = require("@sapphire/framework");
const { emoji, replyToInteraction } = require("../../tools/errorReporter");

class ContextMenuCommandDenied extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "contextMenuCommandDenied" });
  }

  run(error, { interaction }) {
    return replyToInteraction(interaction, `${emoji("error")} ${error}`);
  }
}
module.exports = { ContextMenuCommandDenied };
