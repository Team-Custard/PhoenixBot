const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits, EmbedBuilder, Colors } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const settings = require("../../config.json");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "pardon",
      aliases: [`pd`, `removewarn`, `excuse`],
      description: "Deletes an infraction from a user.",
      detailedDescription: {
        usage: "pardon <caseid>",
        examples: ["pardon 22"],
        args: ["caseid : The case to remove"],
      },
      cooldownDelay: 3_000,
      requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
      preconditions: ["module"]
    });
  }

  async messageRun(message, args) {
    const caseid = await args.pick("number");

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    const thecase = db.infractions.find((c) => c.id == caseid);
    if (!thecase) return message.reply(`${this.container.emojis.error} No such case found.`);

    for (let i = 0; i < db.infractions.length; i++) {
      if (db.infractions[i].id == caseid) db.infractions.splice(i, 1);
    }

    await db.save();
    message.reply(
      `${this.container.emojis.success} Pardoned case  **\` ${caseid} \`** for **${this.container.client.users.cache.get(thecase.member) ? this.container.client.users.cache.get(thecase.member).tag : thecase.member}**'s ${thecase.punishment}.`,
    );

    if (db.logging.infractions) {
      const channel = await message.guild.channels
        .fetch(db.logging.infractions)
        .catch(() => undefined);
      if (channel) {
        const embed = new EmbedBuilder()
          .setTitle(`${thecase.punishment} - Pardoned`)
          .setDescription(
            `**Offender:** <@${thecase.member}>\n**Moderator:** <@${thecase.moderator}>\n**Reason:** ${thecase.reason}`,
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
