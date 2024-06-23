const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits, EmbedBuilder, Colors } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "mute",
      aliases: [`m`],
      description:
        "Mutes a member for a specified amount of time. You can only mute up to a maximum of 28 days. Any incorrect time will be converted into a permanent mute.",
      detailedDescription: {
        usage: "mute <member> [flags] [duration] [reason] ",
        examples: ["mute sylveondev 2h Being cool"],
        args: [
          "member : The member to moderate",
          "duration : The duration of the mute",
          "reason : The reason for the action",
        ],
        flags: [
          `--silent : Don't send a dm to the member.`,
          `--hide : Don't show yourself as the moderator in user dm.`,
        ],
      },
      cooldownDelay: 3_000,
      requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
      flags: true,
    });
  }

  async messageRun(message, args) {
    const member = await args.pick("member");
    const silentDM = args.getFlags("silent", "s");
    const hideMod = args.getFlags("hide", "h");
    const unformattedreason = await args
      .rest("string")
      .catch(() => `No reason specified`);
    let reason = unformattedreason;

    const duration = require("ms")(unformattedreason.replace(/ .*/, ""));
    if (!isNaN(duration)) {
reason = unformattedreason.substring(
        unformattedreason.replace(/ .*/, "").length + 1,
      );
}

    if (message.member == member) {return message.reply(`:x: Bruh. On yourself?`);}
    if (
      member.roles.highest.position >=
      message.guild.members.me.roles.highest.position
    ) {
return message.reply(
        `:x: I'm not high enough in the role hiarchy to moderate this member.`,
      );
}
    if (member.roles.highest.position >= message.member.roles.highest.position) {
return message.reply(
        `:x: You aren't high enough in the role hiarchy to moderate this member.`,
      );
}
    if (!member.moderatable) {return message.reply(`:x: This user is not moderatable.`);}

    let caseid = 0;
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    caseid = db.infractions.length + 1;
    const thecase = {
      id: caseid,
      punishment: "Mute",
      member: member.id,
      moderator: message.member.id,
      reason: reason,
      expiretime: 0,
      expired: false,
      hidden: hideMod,
      modlogID: null,
    };

    if (!isNaN(duration)) {
      if (duration > 0 && duration <= 40320 * 60 * 1000) {
        await member.disableCommunicationUntil(
          Date.now() + duration,
          `(Mute by ${message.author.tag}${isNaN(duration) ? `` : ` | ${require("ms")(duration)}`}) ${reason}`,
        );
      }
 else {
        if (!db.moderation.muteRole) {
return message.reply(
            `:x: To mute members pernamently, a mute role needs to be assigned. Use muterole to set one.`,
          );
}
        await member.roles.add(
          db.moderation.muteRole,
          `(Mute by ${message.author.tag}) ${reason}`,
        );
      }
    }
 else {
      if (!db.moderation.muteRole) {
return message.reply(
          `:x: To mute members pernamently, a mute role needs to be assigned. Use muterole to set one.`,
        );
}
      await member.roles.add(
        db.moderation.muteRole,
        `(Mute by ${message.author.tag}) ${reason}`,
      );
    }

    let dmSuccess = true;
    let embed = new EmbedBuilder()
      .setAuthor({
        name: message.guild.name,
        iconURL: message.guild.iconURL({ dynamic: true }),
      })
      .setTitle(`Your infractions has been updated`)
      .addFields(
        {
          name: `Details:`,
          value: `**ID: \` ${caseid} \` | Type:** ${thecase.punishment} | **Duration:** ${!isNaN(duration) ? `${require("ms")(duration, { long: true })}` : `Permanant`} | **Responsible moderator:** ${hideMod ? `Moderator hidden` : message.author}`,
        },
        { name: `Reason:`, value: reason },
      )
      .setColor(Colors.Orange)
      .setTimestamp(new Date());
    if (!silentDM) {
member.send({ embeds: [embed] }).catch(function() {
        dmSuccess = false;
      });
}

    if (db.logging.infractions) {
      const channel = await message.guild.channels
        .fetch(db.logging.infractions)
        .catch(() => undefined);
      if (channel) {
        embed = new EmbedBuilder()
          .setTitle(`${thecase.punishment} - Case ${thecase.id}`)
          .setDescription(
            `**Offender:** ${member}\n**Moderator:** ${message.author}\n**Duration:** ${!isNaN(duration) ? `${require("ms")(duration, { long: true })}` : `Permanant`}\n**Reason:** ${thecase.reason}`,
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
      `:white_check_mark: **${member.user.tag}** was muted${!isNaN(duration) ? (duration <= 40320 * 60 * 1000 ? ` for **${require("ms")(duration, { long: true })}**` : ``) : ``} with case id **\` ${caseid} \`**. ${silentDM ? "" : dmSuccess ? `(User was notified)` : `(User was not notified)`}`,
    );
  }
}
module.exports = {
  PingCommand,
};
