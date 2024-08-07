const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits, EmbedBuilder, Colors } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const settings = require("../../config.json");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "unmute",
      aliases: [`um`],
      description: "Unmutes a member.",
      detailedDescription: {
        usage: "mute <member> [flags] [reason] ",
        examples: ["unmute sylveondev Love ya"],
        args: [
          "member : The member to moderate",
          "reason : The reason for the action",
        ],
        flags: [
          `--silent : Don't send a dm to the member.`,
          `--hide : Don't show yourself as the moderator in user dm.`,
        ],
      },
      cooldownDelay: 3_000,
      requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
      requiredClientPermissions: [PermissionFlagsBits.ModerateMembers],
      flags: true,
    });
  }

  async messageRun(message, args) {
    const member = await args.pick("member");
    const silentDM = args.getFlags("silent", "s");
    const hideMod = args.getFlags("hide", "h");
    const reason = await args.rest("string").catch(() => `No reason specified`);

    if (message.member == member) {
      return message.reply(`${this.container.emojis.error} Bruh. On yourself?`);
    }
    if (
      member.roles.highest.position >=
      message.guild.members.me.roles.highest.position
    ) {
      return message.reply(
        `${this.container.emojis.error} I'm not high enough in the role hiarchy to moderate this member.`,
      );
    }
    if (
      member.roles.highest.position >= message.member.roles.highest.position
    ) {
      return message.reply(
        `${this.container.emojis.error} You aren't high enough in the role hiarchy to moderate this member.`,
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
      punishment: "Unmute",
      member: member.id,
      moderator: message.member.id,
      reason: reason,
      expiretime: 0,
      expired: false,
      hidden: hideMod,
      modlogID: null,
    };

    if (member.communicationDisabledUntil) {
      await member.disableCommunicationUntil(
        null,
        `(Unmute by ${message.author.tag}) ${reason}`,
      );
    } else {
      if (!db.moderation.muteRole) {
        return message.reply(`${this.container.emojis.error} That user isn't muted.`);
      }
      if (member.roles.cache.has(db.moderation.muteRole)) {
        await member.roles.remove(
          db.moderation.muteRole,
          `(Unmute by ${message.author.tag}) ${reason}`,
        );
      } else {
        return message.reply(`${this.container.emojis.error} That user isn't muted.`);
      }
    }

    let dmSuccess = true;
    const embed = new EmbedBuilder()
      .setAuthor({
        name: message.guild.name,
        iconURL: message.guild.iconURL({ dynamic: true }),
      })
      .setTitle(`Your infractions has been updated`)
      .addFields(
        {
          name: `Details:`,
          value: `**ID: \` ${caseid} \` | Type:** ${thecase.punishment} | **Responsible moderator:** ${hideMod ? `Moderator hidden` : message.author}`,
        },
        { name: `Reason:`, value: reason },
      )
      .setColor(Colors.Orange)
      .setTimestamp(new Date());
    if (!silentDM) {
      member.send({ embeds: [embed] }).catch(function () {
        dmSuccess = false;
      });
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
      `${this.container.emojis.success} **${member.user.tag}** was unmuted with case id **\` ${caseid} \`**. ${silentDM ? "" : dmSuccess ? `(User was notified)` : `(User was not notified)`}`,
    );
  }
}
module.exports = {
  PingCommand,
};
