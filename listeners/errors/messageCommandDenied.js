const { Listener } = require("@sapphire/framework");

class MessageCommandDenied extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "messageCommandDenied",
    });
  }
  run(error, { message }) {
    return message.reply({ content: `:x: ${error}` });
  }
}
module.exports = {
  MessageCommandDenied,
};
