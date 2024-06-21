const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits } = require("discord.js");
const UserDB = require("../../tools/UserDB");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "afk",
      aliases: ["setafk"],
      description: "Sets your afk status.",
      detailedDescription: {
        usage: "afk [reason]",
        examples: ["afk Busy rn", "afk Doing my studies"],
        args: ["reason: The reason you are afk."],
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
    });
  }

  async messageRun(message, args) {
    let usersettings = await UserDB.findById(
      message.member.id,
      UserDB.upsert,
    ).cacheQuery();
    if (!usersettings) usersettings = new UserDB({ _id: message.member.id });
    const reason = await args.rest("string");

    usersettings.afk.since = Math.floor(new Date().getTime() / 1000);
    usersettings.afk.status = reason;

    usersettings
      .save()
      .then(() => {
        message.reply({
          content: `:white_check_mark: You are now afk. To remove your afk status, simply send a message in the server.`,
        });
      })
      .catch((err) => {
        message.reply(`:x: ${err}`);
      });
  }
}
module.exports = {
  PingCommand,
};
