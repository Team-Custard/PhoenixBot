const { Command, Args } = require("@sapphire/framework");
const { PermissionFlagsBits, EmbedBuilder, Colors, Message } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const settings = require("../../config.json");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "shadowban",
      aliases: [`shb`, `banish`],
      description: "Shadowbans a member.",
      detailedDescription: {
        usage: "shadowban <member> [flags] [reason] ",
        examples: [
          "shadowban sylveondev Being cool",
          "shadowban bill11 Being a raccoon --silent",
        ],
        args: [
          "reason : The reason for the action",
          "member : The member to moderate",
        ],
        flags: [
          `--silent : Don't send a dm to the member.`,
          `--hide : Don't show yourself as the moderator in user dm.`,
        ],
      },
      cooldownDelay: 1_800_000,
      cooldownLimit: 20,
      suggestedUserPermissions: [PermissionFlagsBits.ModerateMembers],
      flags: true,
      preconditions: ["module"]
    });
  }

  /**
   * @param {Message} message
   * @param {Args} args
   */
  async messageRun(message, args) {
    const member = await args.pick("member");
    const silentDM = args.getFlags("silent", "s");
    const hideMod = args.getFlags("hide", "h");
    const reason = await args.rest("string").catch(() => `No reason specified`);

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
    if (!member.manageable) {
      return message.reply(`${this.container.emojis.error} This user is not manageable.`);
    }

    let caseid = 0;
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    caseid = db.infractions.length + 1;
    const thecase = {
      id: caseid,
      punishment: "Shadowban",
      member: member.id,
      moderator: message.member.id,
      reason: (reason ? reason : `No reason specified`),
      expiretime: 0,
      expired: false,
      hidden: hideMod,
      modlogID: null,
      creationDate: Math.floor(Math.round(Date.now() / 1000))
    };

    if (!db.moderation.shadowBannedRole) return message.reply(`${this.container.emojis.error} Shadowbanning is not setup.`);

    const previousRoles = member.roles.cache.map(r => r);
    const newRoles = [db.moderation.shadowBannedRole].concat(previousRoles.filter(r => !r.editable || r.managed))

    db.moderation.shadowbannedUsers.push({
        user: member.id,
        roles: previousRoles.map(r => r.id)
    });

    await member.roles.set(newRoles, `(shadowban by ${message.author.tag}) ${reason}`);

    let dmSuccess = true;
      if (!silentDM) member.send({ embeds: [new EmbedBuilder()
        .setTitle(`${this.container.emojis.warning} You were shadowbanned!`)
        .setDescription(`You have been shadowbanned in **${message.guild.name}**.\n**Case: \` ${thecase.id} \`**\n**Moderator:** ${hideMod ? 'Hidden' : `<@!${thecase.moderator}>`}\n**Reason:** ${thecase.reason || 'No reason was provided'}`)
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
        const embedT = new EmbedBuilder()
          .setTitle(`${thecase.punishment} - Case ${thecase.id}`)
          .setDescription(
            `**Offender:** ${member}\n**Moderator:** ${message.author}\n**Reason:** ${thecase.reason}\n**Previous roles:** ${previousRoles}`,
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
      `${this.container.emojis.success} Shadowbanned **${member.user.tag}**. ${!silentDM && dmSuccess ? `` : `User was not notified.`}`,
    );
  }
}
module.exports = {
  PingCommand,
};
