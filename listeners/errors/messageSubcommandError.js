const { Listener } = require("@sapphire/framework");
const { report, userErrorMessage } = require("../../tools/errorReporter");

class MessageSubcommandError extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "messageSubcommandError" });
  }

  async run(error, { message, command }) {
    report(`Error occured while running the prefix subcommand ${command?.name}`, error);
    return message.reply({ content: userErrorMessage(error) }).catch(() => undefined);
  }
}
module.exports = { MessageSubcommandError };
