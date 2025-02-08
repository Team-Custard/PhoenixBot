const { Command, Args } = require("@sapphire/framework");
const {
  PermissionFlagsBits,
  EmbedBuilder,
  Colors,
  Message,
} = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const settings = require("../../config.json");
const { setTimeout } = require("node:timers/promises");

class PingCommand extends Command {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "warn",
      aliases: [`w`, `strike`],
      description: "Adds an infraction to a member.",
      detailedDescription: {
        usage: "warn <member> [flags] [reason] ",
        examples: [
          "warn sylveondev Being cool",
          "warn bill11 Being a raccoon --silent",
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
      cooldownDelay: 3_000,
      suggestedUserPermissions: [PermissionFlagsBits.ModerateMembers],
      flags: true,
      preconditions: ["module"],
    });
  }

  /**
   *
   * @param {Message} message
   * @param {Args} args
   * @returns
   */
  async messageRun(message, args) {
    const member = await args.pick("member");
    const silentDM = args.getFlags("silent", "s");
    const hideMod = args.getFlags("hide", "h");
    const reason = await args
      .rest("string")
      .catch(() => `No reason specified`);

    if (message.guild.members.me == member) {
      return message.reply(`${this.container.emojis.error} You're so mean... After everything I've ever done for you this is how I get treated? What's wrong with you man...`);
    }
    if (message.member == member) {
      return message.reply(`${this.container.emojis.error} Bruh. On yourself?`);
    }
    if (
      member.roles?.highest.position >=
      message.guild.members.me.roles?.highest.position
    ) {
      return message.reply(
        `${this.container.emojis.error} I'm not high enough in the role hiarchy to moderate this member.`,
      );
    }
    if (
      member.roles?.highest.position >= message.member.roles?.highest.position
    ) {
      return message.reply(
        `${this.container.emojis.error} You aren't high enough in the role hiarchy to moderate this member.`,
      );
    }
    if (!member.manageable) {
      return message.reply(
        `${this.container.emojis.error} This user is not manageable.`,
      );
    }

    let caseid = 0;
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    caseid = db.infractions.length + 1;
    let thecase = {
      id: caseid,
      punishment: "Warn",
      member: member.id,
      moderator: message.member.id,
      reason: (reason ? reason : `No reason specified`),
      expiretime: 0,
      expired: false,
      hidden: hideMod,
      modlogID: null,
      creationDate: Math.round(Date.now() / 1000),
    };
    let thecase2;

    const system = db.moderation.system.find(w => w.warnings == (db.infractions.filter(i => (i.punishment == "Warn" && i.member == member.id)).length + 1));
    let systemfailed = false;

    let sysduration = system?.duration > 0 ? system?.duration : null;

    if (system) {
      if (system.punishment == "mute") {
        thecase2 = {
          id: caseid+1,
          punishment: system.punishment,
          member: member.id,
          moderator: this.container.client.user.id,
          reason: `(Automod) Reached ${system.warnings} active warnings.`,
          expiretime: (sysduration == 0 ? 0 : Math.round(Date.now() / 1000) + Math.round(sysduration / 1000)),
          expired: false,
          hidden: false,
          modlogID: null,
          creationDate: Math.round(Date.now() / 1000),
        };
      }
    }
    

    let dmSuccess = true;
    if (!silentDM) {
      const embeds = [
        new EmbedBuilder()
          .setTitle(`${this.container.emojis.warning} Warning recieved!`)
          .setDescription(
            `You were issued a warning in **${message.guild.name}**. You now have ${db.infractions.filter(i => (i.punishment == "Warn" && i.member == member.id)).length+1} warnings.\n**Case: \` ${thecase.id} \`**\n**Moderator:** ${hideMod ? "Hidden" : `<@!${thecase.moderator}>`}\n**Reason:** ${thecase.reason || "No reason was provided"}`,
          )
          .setFooter({
            text: message.guild.name,
            iconURL: message.guild.iconURL({ dynamic: true }),
          })
          .setColor(Colors.Orange)
      ]
      if (system)
        embeds.push(new EmbedBuilder()
          .setTitle(`Punishment system`)
          .setDescription(`You have reached **${system.warnings}** warnings. You have recieved a ${system.punishment.toLowerCase()}${sysduration > 0 ? ` for ${await require("pretty-ms")(sysduration, {verbose: true})}` : ``}.`)
          .setColor(Colors.Orange)
        )

      member
        .send({
          embeds: embeds,
        })
        .catch(function () {
          dmSuccess = false;
        });
    }

    if (system) {
      if (system.punishment == "mute") {
        thecase2 = {
          id: caseid+1,
          punishment: system.punishment,
          member: member.id,
          moderator: this.container.client.user.id,
          reason: `(Automod) Reached ${system.warnings} active warnings.`,
          expiretime: (sysduration == 0 ? 0 : Math.round(Date.now() / 1000) + Math.round(sysduration / 1000)),
          expired: false,
          hidden: false,
          modlogID: null,
          creationDate: Math.round(Date.now() / 1000),
        };
        member.disableCommunicationUntil(Date.now() + sysduration, `(Warn by ${message.author.tag}) [${system.warnings} warnings] ${reason}`)
        .catch(function (err) {
          console.log(err);
          systemfailed = true;
        })
      }

      if (system.punishment == "kick") {
        thecase2 = {
          id: caseid+1,
          punishment: system.punishment,
          member: member.id,
          moderator: this.container.client.user.id,
          reason: `(Automod) Reached ${system.warnings} active warnings.`,
          expiretime: (sysduration == 0 ? 0 : Math.round(Date.now() / 1000) + Math.round(sysduration / 1000)),
          expired: false,
          hidden: false,
          modlogID: null,
          creationDate: Math.round(Date.now() / 1000),
        };
        member.kick(`(Warn by ${message.author.tag}) [${system.warnings} warnings] ${reason}`)
        .catch(function (err) {
          console.log(err);
          systemfailed = true;
        })
      }

      if (system.punishment == "shadowban") {
        thecase2 = {
          id: caseid+1,
          punishment: system.punishment,
          member: member.id,
          moderator: this.container.client.user.id,
          reason: `(Automod) Reached ${system.warnings} active warnings.`,
          expiretime: (sysduration == 0 ? 0 : Math.round(Date.now() / 1000) + Math.round(sysduration / 1000)),
          expired: false,
          hidden: false,
          modlogID: null,
          creationDate: Math.round(Date.now() / 1000),
        };

        const previousRoles = member.roles.cache.map(r => r);

        db.moderation.shadowbannedUsers.push({
            user: member.id,
            roles: member.roles.cache.map(r => r.id)
        });

        await member.roles.set([db.moderation.shadowBannedRole], `(Warn by ${message.author.tag}) [${system.warnings} warnings] ${reason}`)
        .catch(function (err) {
          console.log(err);
          systemfailed = true;
        })
      }

      if (system.punishment == "ban") {
        thecase2 = {
          id: caseid+1,
          punishment: system.punishment,
          member: member.id,
          moderator: this.container.client.user.id,
          reason: `(Automod) Reached ${system.warnings} active warnings.`,
          expiretime: (sysduration == 0 ? 0 : Math.round(Date.now() / 1000) + Math.round(sysduration / 1000)),
          expired: false,
          hidden: false,
          modlogID: null,
          creationDate: Math.round(Date.now() / 1000),
        };
        member.ban({ reason: `(Warn by ${message.author.tag}) [${system.warnings} warnings] ${reason}` })
        .catch(function (err) {
          console.log(err);
          systemfailed = true;
        })

        if (sysduration > 0 && !systemfailed) {
          this.container.tasks.create({ name: 'tempBan', payload: { guildid: message.guild.id, memberid: member.id, caseid: thecase2.id } }, { delay: sysduration, customJobOptions: { removeOnComplete: true, removeOnFail: true } });
        }
      }
    }

    if (db.logging.infractions) {
      const channel = await message.guild.channels
        .fetch(db.logging.infractions)
        .catch(() => undefined);
      if (channel) {
        const embedT = new EmbedBuilder()
          .setTitle(`${thecase.punishment} - Case ${thecase.id}`)
          .setDescription(
            `**Offender:** ${member}\n**Moderator:** ${hideMod ? "Hidden" : message.author}\n**Reason:** ${thecase.reason}`,
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

        if (system && !systemfailed) {
          const embedT = new EmbedBuilder()
          .setTitle(`${system.punishment} - Case ${thecase2.id}`)
          .setDescription(
            `**Offender:** ${member}\n**Moderator:** ${this.container.client.user}\n**Duration:** ${sysduration > 0 ? `${await require("pretty-ms")(sysduration, { verbose: true })}` : `Permanent`}\n**Reason:** ${thecase2.reason}`,
          )
          .setColor(Colors.Orange)
          .setFooter({ text: `ID ${member.id}` })
          .setTimestamp(new Date());

          const msgT = await channel
            .send({
              // content: '',
              embeds: [embedT],
            })
            .catch((err) => {
              console.error(`[error] Error on sending to channel`, err);
              return undefined;
            });
          if (msgT) thecase2.modlogID = msgT.id;
        }
      }
    }

    db.infractions.push(thecase);
    if (system && !systemfailed) {
      db.infractions.push(thecase2);
    }
    await db.save();
    message.reply(
      `${this.container.emojis.success} Warned **${member.user.tag}**, ${require("ordinal-js").toOrdinal(db.infractions.filter(i => (i.punishment == "Warn" && i.member == member.id)).length)} warning. ${!silentDM && dmSuccess ? `` : `User was not notified.`}${system ? (systemfailed ? `\n${this.container.emojis.warning} Unable to execute the punishment system.`: `\nUser recieved a ${system.punishment.toLowerCase()} for this warning.`):``}`,
    );
  }
}
module.exports = {
  PingCommand,
};
