const { Listener } = require("@sapphire/framework");
const { emoji, withServerEmojis } = require("../../tools/errorReporter");

class MessageSubcommandDenied extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "messageSubcommandDenied" });
  }

  run(error, { message }) {
    if (Reflect.get(Object(error.context), "silent") || message.channel.isDMBased()) return;
    return withServerEmojis(message.guildId, () => message.reply({ content: `${emoji("error")} ${error}` }).catch(() => undefined));
  }
}
module.exports = { MessageSubcommandDenied };
