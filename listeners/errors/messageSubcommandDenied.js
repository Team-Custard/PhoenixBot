const { Listener } = require("@sapphire/framework");

class MessageSubcommandDenied extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "messageSubcommandDenied",
    });
  }
  run(error, { message }) {
    return message.reply({ content: `${this.container.emojis.error} ${error}` });
  }
}
module.exports = {
  MessageSubcommandDenied,
};
