const { Listener } = require("@sapphire/framework");

class messageCommandError extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "messageCommandError",
    });
  }
  run(error, { message, command }) {
    message.reply({ content: `${this.container.emojis.error} ${error}` });
  }
}
module.exports = {
  messageCommandError,
};
