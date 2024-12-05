const { Command } = require("@sapphire/framework");
const { PermissionFlagsBits, EmbedBuilder, Colors } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const settings = require("../../config.json");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "ban",
      aliases: [`b`, `yeet`, `obliterate`],
      description:
        "Bans a member. Note that temporary bans are not yet possible through Phoenix at this time.",
      detailedDescription: {
        usage: "ban <member> [flags] [duration] [reason] ",
        examples: [
          "ban sylveondev Being cool",
          "ban bill11 5h Being a raccoon --silent",
        ],
        args: [
          "reason : The reason for the action",
          "duration : The duration of the mute",
          "member : The member to moderate",
        ],
        flags: [
          `--silent : Don't send a dm to the member.`,
          `--hide : Don't show yourself as the moderator in user dm.`,
          `--purge : Deletes 7 days worth of the user's messages.`,
          `--mass : Bans multiple specified members at once. They will not recieve a dm if this is used.`,
          `--link : Bans the member from all servers your server is affiliated with (shareban).`
        ],
      },
      cooldownDelay: 3_000,
      requiredUserPermissions: [PermissionFlagsBits.BanMembers],
      requiredClientPermissions: [PermissionFlagsBits.BanMembers],
      flags: true,
      preconditions: ["module"]
    });
  }

  async messageRun(message, args) {
    const member = await args.pick("user");
    let silentDM = args.getFlags("silent", "s");
    const hideMod = args.getFlags("hide", "h");
    const purge = args.getFlags("purge", "p");
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

    // Run a check if the user is in the server. We need to do this to see if
    // the moderator and bot has the correct permissions to ban the member.
    // Forcefully enable the silentDM flag if the member isn't in the server.
    // Users shouldn't be notified if they have been banned from a server they aren't in
    const isBanned = await message.guild.bans
      .fetch(member.id)
      .catch(() => undefined);
    if (isBanned) return message.reply(`${this.container.emojis.error} That user is already banned.`);
    const isGuildMember = await message.guild.members
      .fetch(member.id)
      .catch(() => undefined);
    if (!isGuildMember) silentDM = true;
    else {
      if (message.member == member) {
        return message.reply(`${this.container.emojis.error} Bruh. On yourself?`);
      }
      if (
        isGuildMember.roles.highest.position >=
        message.guild.members.me.roles.highest.position
      ) {
        return message.reply(
          `${this.container.emojis.error} I'm not high enough in the role hiarchy to moderate this member.`,
        );
      }
      if (
        isGuildMember.roles.highest.position >= message.member.roles.highest.position
      ) {
        return message.reply(
          `${this.container.emojis.error} You aren't high enough in the role hiarchy to moderate this member.`,
        );
      }
      if (!isGuildMember.bannable) {
        return message.reply(`${this.container.emojis.error} This user is not bannable.`);
      }
    }

    let caseid = 0;
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    caseid = db.infractions.length + 1;
    const thecase = {
      id: caseid,
      punishment: "Ban",
      member: member.id,
      moderator: message.member.id,
      reason: reason,
      expiretime: (isNaN(duration) ? 0 : Math.round(Date.now() / 1000) + Math.round(duration / 1000)),
      expired: false,
      hidden: hideMod,
      modlogID: null,
      creationDate: (Math.round(Date.now() / 1000))
    };

    let dmSuccess = true;
      if (!silentDM) member.send({ embeds: [new EmbedBuilder()
        .setTitle(`${this.container.emojis.error} You were banned!`)
        .setDescription(`You have been banned from **${message.guild.name}**.\n**Case: \` ${thecase.id} \`**\n**Moderator:** ${hideMod ? 'Hidden' : `<@!${thecase.moderator}>`}\n**Duration:** ${!isNaN(duration) ? (duration <= 40320 * 60 * 1000 ? ` for ${await require("pretty-ms")(duration, { verbose: true })}` : `Permanent`) : `Permanent`}\n**Reason:** ${thecase.reason || 'No reason was provided'}`)
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL({ dynamic: true })
        })
        .setColor(Colors.Orange)
      ]}).catch(function () {
        dmSuccess = false;
      });
    await message.guild.bans.create(member.id, {
      deleteMessageSeconds: purge ? 60 * 60 * 24 * 7 : 0,
      reason: `(Ban by ${message.author.tag}${isNaN(duration) ? `` : ` | ${require("ms")(duration)}`}) ${reason}`,
    });
    if (!isNaN(duration)) {
      this.container.tasks.create({ name: 'tempBan', payload: { guildid: message.guild.id, memberid: member.id } }, { delay: duration, customJobOptions: { removeOnComplete: true, removeOnFail: true } });
    }

    if (db.logging.infractions) {
      const channel = await message.guild.channels
        .fetch(db.logging.infractions)
        .catch(() => undefined);
      if (channel) {
        const embedT = new EmbedBuilder()
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
            embeds: [embedT],
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
      `${this.container.emojis.success} Banned **${member.tag}**${!isNaN(duration) ? ` for ${await require("pretty-ms")(duration, { verbose: true })}` : ``}. ${!silentDM && dmSuccess ? `` : `User was not notified.`}`,
    );
  }
}
module.exports = {
  PingCommand,
};
