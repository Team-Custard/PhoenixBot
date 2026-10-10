const { Listener, Events } = require("@sapphire/framework");
const { sendLog, logEmbed } = require("../../../tools/logging");

class MessageCommandLogger extends Listener {
  constructor(context, options) {
    super(context, { ...options, name: "messageCommandLogger", event: Events.MessageCommandFinish });
  }

  run(message, command) {
    if (!message.guild || message.author.bot) return undefined;
    const embed = logEmbed(
      message.author,
      `${message.author} executed the prefix command ${command.name} in ${message.channel}\n**Message:**\n${message.content}`,
    );
    return sendLog(message.guild, "commands", { embeds: [embed] });
  }
}

module.exports = { MessageCommandLogger };
