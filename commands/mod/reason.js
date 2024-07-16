const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits, EmbedBuilder, Colors } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const settings = require("../../config.json");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "reason",
      aliases: [`setreason`],
      description:
        "Changes the reason of an infraction. Note changing infractions makes you the responsible moderator.",
      detailedDescription: {
        usage: "reason <caseid> <newreason>",
        examples: ["reason 22 Being mean", "reason 4 Insults"],
        args: [
          "caseid : The case to modify",
          "newreason : The new reason for the infraction",
        ],
      },
      cooldownDelay: 3_000,
      requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
    });
  }

  async messageRun(message, args) {
    const caseid = await args.pick("number");
    const reason = await args.rest("string");

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    const thecase = db.infractions.find((c) => c.id == caseid);
    if (!thecase) return message.reply(`:x: No such case found.`);
    console.log(thecase);

    thecase.moderator = message.member.id;
    thecase.reason = reason;
    await db.save();
    message.reply(
      `:white_check_mark: Modified reason for case  **\` ${caseid} \`**.`,
    );

    if (db.logging.infractions) {
      const channel = await message.guild.channels
        .fetch(db.logging.infractions)
        .catch(() => undefined);
      if (channel) {
        const embed = new EmbedBuilder()
          .setTitle(`${thecase.punishment} - Case ${thecase.id}`)
          .setDescription(
            `**Offender:** <@${thecase.member}>\n**Moderator:** ${message.author}\n**Reason:** ${reason}`,
          )
          .setColor(Colors.Orange)
          .setFooter({ text: `ID ${thecase.member}` })
          .setTimestamp(new Date());

        await channel.messages
          .fetch(thecase.modlogID)
          .then(function (msg) {
            console.log(thecase.modlogID);
            msg.edit({ embeds: [embed] });
          })
          .catch(function (err) {
            console.error(`[error] Error on sending to channel`, err);
          });
      }
    }
  }
}
module.exports = {
  PingCommand,
};
