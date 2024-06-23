const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits } = require("discord.js");
const UserDB = require("../../tools/UserDB");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "timefor",
      aliases: ["tf", "time"],
      description: "Displays a user's time.",
      detailedDescription: {
        usage: "timefor [user]",
        examples: ["timefor @sylveondev"],
        args: ["user: The user you're getting the time for"],
      },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
    });
  }

  async messageRun(message, args) {
    const user = await args.pick("user").catch(() => message.author);

    const usersettings = await UserDB.findById(
      user.id,
      UserDB.upsert,
    ).cacheQuery();
    if (!usersettings) {
      return message.reply(
        `:x: **${user.username}** does not have a timezone set.`,
      );
    }
    if (!usersettings.timezone) {
      return message.reply(
        `:x: **${user.username}** does not have a timezone set.`,
      );
    }

    const moment = require("moment-timezone");
    const date = new Date();
    const strTime = moment(date).tz(usersettings.timezone).format("hh:mm:ss");
    const strDate = moment(date).tz(usersettings.timezone).format("MM-DD-YYYY");
    await message.reply(
      `**${user.username}**'s time is **${strTime}** (${strDate}).`,
    );
  }
}
module.exports = {
  PingCommand,
};
