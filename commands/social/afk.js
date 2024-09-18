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
      preconditions: ["module"]
    });
  }

  async chatInputRun(interaction) {
    await interaction.deferReply();
    let usersettings = await UserDB.findById(
      interaction.member.id,
      UserDB.upsert,
    ).cacheQuery();
    if (!usersettings) usersettings = new UserDB({ _id: interaction.member.id });
    const reason = interaction.options.getString("reason");

    if (usersettings.afk.since) return interaction.followUp(`${this.container.emojis.warning} You caught a strange issue where you seem to already have an afk status set. The status should automatically clear in a moment. If it doesn't clear itself in 5 seconds, ping yourself and it'll force the status to clear.`)

    usersettings.afk.since = Math.floor(new Date().getTime() / 1000);
    usersettings.afk.status = reason;

    usersettings
      .save()
      .then(() => {
        interaction.followUp({
          content: `${this.container.emojis.success} Successfully set your afk to \`${reason}\`. \n-# To remove your afk status, simply send a message in a server with Phoenix in it.`,
        });
      })
      .catch((err) => {
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      });
  }
  
  async messageRun(message, args) {
    let usersettings = await UserDB.findById(
      message.member.id,
      UserDB.upsert,
    ).cacheQuery();
    if (!usersettings) usersettings = new UserDB({ _id: message.member.id });
    const reason = await args.rest("string");

    if (usersettings.afk.since) return message.reply(`${this.container.emojis.warning} You caught a strange issue where you seem to already have an afk status set. The status should automatically clear in a moment. If it doesn't clear itself in 5 seconds, ping yourself and it'll force the status to clear.`)

    usersettings.afk.since = Math.floor(new Date().getTime() / 1000);
    usersettings.afk.status = reason;

    usersettings
      .save()
      .then(() => {
        message.reply({
          content: `${this.container.emojis.success} Successfully set your afk to \`${reason}\`. \n-# To remove your afk status, simply send a message in a server with Phoenix in it.`,
        });
      })
      .catch((err) => {
        message.reply(`${this.container.emojis.error} ${err}`);
      });
  }
}
module.exports = {
  PingCommand,
};
