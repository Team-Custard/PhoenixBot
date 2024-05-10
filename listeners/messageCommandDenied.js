const { Listener } = require('@sapphire/framework');

class MessageCommandDenied extends Listener {
    run(error, { message }) {
        return message.reply({ content: `:x: ${error}` });
    }
}
module.exports = {
  MessageCommandDenied
};