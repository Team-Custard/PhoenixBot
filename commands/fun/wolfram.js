const { Command } = require("@sapphire/framework");
const { BucketScope } = require("@sapphire/framework");
const { PermissionFlagsBits } = require("discord.js");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "wolfram",
      aliases: [],
      description: "Gets an answer from wolfram|alpha on something.",
      detailedDescription: {
        usage: "wolfram <question>",
        examples: ["wolfram 10 USD to CAD", "wolfram 5*10"],
        args: ["question: The question to ask."],
      },
      cooldownDelay: 60_000,
      cooldownLimit: 10,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AttachFiles,
      ],
      preconditions: ["module"]
    });
  }

  async messageRun(message, args) {
    const unfilteredquery = await args.rest("string");
    const query = encodeURIComponent(unfilteredquery);

    await fetch(
      `https://api.wolframalpha.com/v1/result?i=${query}&appid=${process.env["wolframkey"]}`,
    )
      .then(async (response) => {
        if (response.status != 200) {
          return message.reply(`${this.container.emojis.error} Not found or error occured.`);
        }
        const result = await response.text();
        if (!result) return message.reply(`${this.container.emojis.error} Not found or error occured.`);
        message.reply(`:information_source: ${result}`);
      })
      .catch((err) => {
        message.reply(`${this.container.emojis.error} ${err}`);
      });
  }
}
module.exports = {
  PingCommand,
};
