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
      preconditions: ["module"]
    });
  }

  async chatInputRun(interaction) {
    await interaction.deferReply();
    let member = await interaction.options.getMember("user");

    if (!member) member = interaction.member;

    const usersettings = await UserDB.findById(
      member.user.id,
      UserDB.upsert,
    ).cacheQuery();
    if (!usersettings) {
      return interaction.followUp(
        `${this.container.emojis.error} **${member.user.username}** does not have a timezone set.`,
      );
    }
    if (!usersettings.timezone) {
      return interaction.followUp(
        `${this.container.emojis.error} **${member.user.username}** does not have a timezone set.`,
      );
    }

    const moment = require("moment-timezone");
    const date = new Date();
    const strTime = moment(date).tz(usersettings.timezone).format("hh:mm:ss");
    const strDate = moment(date).tz(usersettings.timezone).format("MM-DD-YYYY");
    await interaction.followUp(
      `**${member.user.username}**'s time is **${strTime}** (${strDate}).`,
    );
  }

  async messageRun(message, args) {
    const user = await args.pick("user").catch(() => message.author);

    const usersettings = await UserDB.findById(
      user.id,
      UserDB.upsert,
    ).cacheQuery();
    if (!usersettings) {
      return message.reply(
        `${this.container.emojis.error} **${user.username}** does not have a timezone set.`,
      );
    }
    if (!usersettings.timezone) {
      return message.reply(
        `${this.container.emojis.error} **${user.username}** does not have a timezone set.`,
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
