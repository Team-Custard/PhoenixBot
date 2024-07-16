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
        usage: "ban <member> [flags] [reason] ",
        examples: [
          "ban sylveondev Being cool",
          "ban bill11 Being a raccoon --silent",
        ],
        args: [
          "reason : The reason for the action",
          "member : The member to moderate",
        ],
        flags: [
          `--silent : Don't send a dm to the member.`,
          `--hide : Don't show yourself as the moderator in user dm.`,
          `--purge : Purges the user's messages up to 7 days`,
        ],
      },
      cooldownDelay: 3_000,
      requiredUserPermissions: [PermissionFlagsBits.BanMembers],
      requiredClientPermissions: [PermissionFlagsBits.BanMembers],
      flags: true,
    });
  }

  async messageRun(message, args) {
    const member = await args.pick("user");
    let silentDM = args.getFlags("silent", "s");
    const hideMod = args.getFlags("hide", "h");
    const purge = args.getFlags("purge", "p");
    const reason = await args.rest("string").catch(() => `No reason specified`);

    // Run a check if the user is in the server. We need to do this to see if
    // the moderator and bot has the correct permissions to ban the member.
    // Forcefully enable the silentDM flag if the member isn't in the server.
    // Users shouldn't be notified if they have been banned from a server they aren't in
    const isBanned = await message.guild.bans
      .fetch(member.id)
      .catch(() => undefined);
    if (isBanned) return message.reply(`:x: That user is already banned.`);
    const isGuildMember = await message.guild.members
      .fetch(member.id)
      .catch(() => undefined);
    if (!isGuildMember) silentDM = true;
    else {
      if (message.member == member) {
        return message.reply(`:x: Bruh. On yourself?`);
      }
      if (
        member.roles.highest.position >=
        message.guild.members.me.roles.highest.position
      ) {
        return message.reply(
          `:x: I'm not high enough in the role hiarchy to moderate this member.`,
        );
      }
      if (
        member.roles.highest.position >= message.member.roles.highest.position
      ) {
        return message.reply(
          `:x: You aren't high enough in the role hiarchy to moderate this member.`,
        );
      }
      if (!member.bannable) {
        return message.reply(`:x: This user is not bannable.`);
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
      expiretime: 0,
      expired: false,
      hidden: hideMod,
      modlogID: null,
    };

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
    await message.guild.bans.create(member.id, {
      deleteMessageSeconds: purge ? 60 * 60 * 24 * 7 : 0,
      reason: `(Ban by ${message.author.tag}) ${reason}`,
    });

    if (db.logging.infractions) {
      const channel = await message.guild.channels
        .fetch(db.logging.infractions)
        .catch(() => undefined);
      if (channel) {
        const embedT = new EmbedBuilder()
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
      `:white_check_mark: **${member.tag}** was banned with case id **\` ${caseid} \`**. ${silentDM ? "" : dmSuccess ? `(User was notified)` : `(User was not notified)`}`,
    );
  }
}
module.exports = {
  PingCommand,
};
