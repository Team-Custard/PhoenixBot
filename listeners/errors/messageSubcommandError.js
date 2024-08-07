const { Listener } = require("@sapphire/framework");

class messageSubcommandError extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "messageSubcommandError",
    });
  }
  run(error, { message, command }) {
    message.reply({ content: `${this.container.emojis.error} ${error}` });
  }
}
module.exports = {
  messageSubcommandError,
};
