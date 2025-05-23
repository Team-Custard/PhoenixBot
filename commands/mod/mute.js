const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits, EmbedBuilder, Colors } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "mute",
      aliases: [`m`, `timeout`, `silence`],
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
      cooldownDelay: 1_800_000,
      cooldownLimit: 20,
      suggestedUserPermissions: [PermissionFlagsBits.ModerateMembers],
      requiredClientPermissions: [PermissionFlagsBits.ModerateMembers],
      flags: true,
      preconditions: ["module"]
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

    if (message.member == member) {
      return message.reply(`${this.container.emojis.error} You can't use this on yourself.`);
    }
    if (
      member.roles.highest.position >=
      message.guild.members.me.roles.highest.position
    ) {
      return message.reply(
        `${this.container.emojis.error} I'm not high enough in the role hierarchy to moderate this member.`,
      );
    }
    if (
      member.roles.highest.position >= message.member.roles.highest.position
    ) {
      return message.reply(
        `${this.container.emojis.error} You aren't high enough in the role hierarchy to moderate this member.`,
      );
    }
    if (!member.moderatable) {
      return message.reply(`${this.container.emojis.error} This user is not moderatable.`);
    }

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
      reason: (reason ? reason : `No reason specified`),
      expiretime: (isNaN(duration) ? 0 : Math.round(Date.now() / 1000) + Math.round(duration / 1000)),
      expired: false,
      hidden: hideMod,
      modlogID: null,
      creationDate: Math.floor(Math.round(Date.now() / 1000))
    };

    if (!isNaN(duration)) {
      if (duration > 0 && duration <= 40320 * 60 * 1000) {
        await member.disableCommunicationUntil(
          Date.now() + duration,
          `(Mute by ${message.author.tag}${isNaN(duration) ? `` : ` | ${require("ms")(duration)}`}) ${reason}`,
        );
      } else {
        if (!db.moderation.muteRole) {
          return message.reply(
            `${this.container.emojis.error} To mute members pernamently, a mute role needs to be assigned. Use muterole to set one.`,
          );
        }
        await member.roles.add(
          db.moderation.muteRole,
          `(Mute by ${message.author.tag}) ${reason}`,
        );
      }
    } else {
      if (!db.moderation.muteRole) {
        return message.reply(
          `${this.container.emojis.error} To mute members pernamently, a mute role needs to be assigned. Use muterole to set one.`,
        );
      }
      await member.roles.add(
        db.moderation.muteRole,
        `(Mute by ${message.author.tag}) ${reason}`,
      );
    }

    let dmSuccess = true;
      if (!silentDM) member.send({ embeds: [new EmbedBuilder()
        .setTitle(`${this.container.emojis.warning} You were muted!`)
        .setDescription(`You have been muted in **${message.guild.name}**.\n**Case: \` ${thecase.id} \`**\n**Moderator:** ${hideMod ? 'Hidden' : `<@!${thecase.moderator}>`}\n**Duration:** ${!isNaN(duration) ? (duration <= 40320 * 60 * 1000 ? ` for ${await require("pretty-ms")(duration, { verbose: true })}` : `Permanent`) : `Permanent`}\n**Reason:** ${thecase.reason || 'No reason was provided'}`)
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL({ dynamic: true })
        })
        .setColor(Colors.Orange)
      ]}).catch(function () {
        dmSuccess = false;
      });

    if (db.logging.infractions) {
      const channel = await message.guild.channels
        .fetch(db.logging.infractions)
        .catch(() => undefined);
      if (channel) {
        const embed = new EmbedBuilder()
          .setTitle(`${thecase.punishment} - Case ${thecase.id}`)
          .setDescription(
            `**Offender:** ${member}\n**Moderator:** ${message.author}\n**Duration:** ${!isNaN(duration) ? `${await require("pretty-ms")(duration, { verbose: true })}` : `Permanant`}\n**Reason:** ${thecase.reason}`,
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
      `${this.container.emojis.success} Muted **${member.user.tag}**${!isNaN(duration) ? (duration <= 40320 * 60 * 1000 ? ` for ${await require("pretty-ms")(duration, { verbose: true })}` : ``) : ``}. ${!silentDM && dmSuccess ? `` : `User was not notified.`}`,
    );
  }
}
module.exports = {
  PingCommand,
};
