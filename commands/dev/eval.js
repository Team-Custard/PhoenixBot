const { Command } = require("@sapphire/framework");
const { Colors } = require("discord.js");
const { PermissionFlagsBits } = require("discord.js");

function clean(text) {
  if (typeof text === "string") {
    return text
      .replace(/`/g, "`" + String.fromCharCode(8203))
      .replace(/@/g, "@" + String.fromCharCode(8203));
  } else {
    return text;
  }
}

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "eval",
      aliases: ["runcode"],
      description:
        "Runs code from chat and returns the result. This command can only be ran by the bot developer.",
      detailedDescription: {
        usage: "eval <code>",
        examples: ["eval new Date();"],
        args: ["code: The code to run"],
        flags: ["silent : Don't send the results embed"],
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ["devCommand"],
      flags: true,
    });
  }

  async messageRun(message, args) {
    const silent = args.getFlags("silent", "s");
    const code = await args.rest("string");

    try {
      const evaled = eval(code);
      if (!silent)
        message.reply({
          embeds: [
            {
              fields: [
                { name: "📥 Input code", value: `\`\`\`${code}\`\`\`` },
                {
                  name: "📤 Output code",
                  value: `\`\`\`${clean(evaled)}\`\`\``,
                },
              ],
              color: Colors.Orange,
            },
          ],
          code: "xl",
        });
      else message.react(`✅`);
    } catch (err) {
      message.reply(`The code returned an error. ${clean(err)}`);
    }
  }
}
module.exports = {
  PingCommand,
};
