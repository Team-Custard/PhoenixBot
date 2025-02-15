const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits, EmbedBuilder, Colors } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const settings = require("../../config.json");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "unban",
      aliases: [`ub`],
      description: "Unbans a member.",
      detailedDescription: {
        usage: "unban <member> [reason] ",
        examples: ["unban sylveondev You're cool now"],
        args: [
          "member : The member to moderate",
          "reason : The reason for the action",
        ],
      },
      cooldownDelay: 3_000,
      requiredUserPermissions: [PermissionFlagsBits.BanMembers],
      requiredClientPermissions: [PermissionFlagsBits.BanMembers],
    });
  }

  async messageRun(message, args) {
    const member = await args.pick("user");
    const reason = await args.rest("string").catch(() => `No reason specified`);

    if (message.author == member) {
      return message.reply(`:x: Bruh. On yourself?`);
    }

    let caseid = 0;
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    caseid = db.infractions.length + 1;
    const thecase = {
      id: caseid,
      punishment: "Unban",
      member: member.id,
      moderator: message.member.id,
      reason: reason,
      expiretime: 0,
      expired: false,
      hidden: false,
      modlogID: null,
    };

    const unban = await message.guild.bans.remove(member.id).catch((e) => {
      return { id: "error", msg: e.message };
    });
    if (unban.id == `error`) {
      switch (unban.msg.toLowerCase()) {
        case "unknown ban": {
          await message.reply(`:x: That user isn't banned.`);
          break;
        }
        default: {
          await message.reply(`:x: ${unban.msg}`);
        }
      }
      return;
    }

    if (db.logging.infractions) {
      const channel = await message.guild.channels
        .fetch(db.logging.infractions)
        .catch(() => undefined);
      if (channel) {
        const embed = new EmbedBuilder()
          .setTitle(`${thecase.punishment} - Case ${thecase.id}`)
          .setDescription(
            `**Offender:** ${member}\n**Moderator:** ${message.author}\n**Reason:** ${thecase.reason}`,
          )
          .setColor(Colors.Orange)
          .setFooter({ text: `ID ${member.id}` })
          .setTimestamp(new Date());

        const msg = await channel
          .send({
            // content: '',
            embeds: [embed],
          })
          .catch((err) => {
            console.error(`[error] Error on sending to channel`, err);
            return undefined;
          });
        if (msg) thecase.modlogID = msg.id;
      }
    }

    db.infractions.push(thecase);

    await db.save();
    message.reply(
      `:white_check_mark: **${member.tag}** was unbanned with case id **\` ${caseid} \`**.`,
    );
  }
}
module.exports = {
  PingCommand,
};
