const { Listener } = require("@sapphire/framework");
const { report, userErrorMessage } = require("../../tools/errorReporter");

class MessageCommandError extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "messageCommandError" });
  }

  async run(error, { message, command }) {
    report(`Error occured while running the prefix command ${command?.name}`, error);
    return message.reply({ content: userErrorMessage(error) }).catch(() => undefined);
  }
}
module.exports = { MessageCommandError };
