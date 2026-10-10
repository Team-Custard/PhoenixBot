const { Listener } = require("@sapphire/framework");
const { emoji, replyToInteraction } = require("../../tools/errorReporter");

class ChatInputCommandDenied extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "chatInputCommandDenied" });
  }

  run(error, { interaction }) {
    return replyToInteraction(interaction, `${emoji("error")} ${error}`);
  }
}
module.exports = { ChatInputCommandDenied };
