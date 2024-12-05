const { Listener } = require("@sapphire/framework");
const ServerSettings = require("../../../tools/SettingsSchema");
const { EmbedBuilder, Colors, GuildMember, AuditLogEvent } = require("discord.js");
const webhookFetch = require("../../../tools/webhookFetch");

// Code: https://stackoverflow.com/questions/6108819/javascript-timestamp-to-relative-time
function timeDifference(current, previous) {

  var msPerMinute = 60 * 1000;
  var msPerHour = msPerMinute * 60;
  var msPerDay = msPerHour * 24;
  var msPerMonth = msPerDay * 30;
  var msPerYear = msPerDay * 365;

  var elapsed = current - previous;

  if (elapsed < msPerMinute) {
       return Math.round(elapsed/1000) + ' seconds';   
  }

  else if (elapsed < msPerHour) {
       return Math.round(elapsed/msPerMinute) + ' minutes';   
  }

  else if (elapsed < msPerDay ) {
       return Math.round(elapsed/msPerHour ) + ' hours';   
  }

  else if (elapsed < msPerMonth) {
      return 'About ' + Math.round(elapsed/msPerDay) + ' days';   
  }

  else if (elapsed < msPerYear) {
      return 'About ' + Math.round(elapsed/msPerMonth) + ' months';   
  }

  else {
      return 'About ' + Math.round(elapsed/msPerYear ) + ' years';   
  }
}

class GuildMemberAdd extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "guildMemberUpdate",
      name: "loggerMemberTimedout",
    });
  }

  /**
   * @param {GuildMember} oldMember 
   * @param {GuildMember} member 
   * @returns 
   */
  async run(oldMember, member) {
    if (this.container.client.id == "1239263616025493504") {
      const hasStaging = await member.guild.members
        .fetch("1227318291475730443")
        .catch(() => undefined);
      if (hasStaging) return;
    }

    const db = await ServerSettings.findById(member.guild.id).cacheQuery();
    if (db.logging.moderation) {
      const channel = await member.guild.channels
        .fetch(db.logging.moderation)
        .catch(() => undefined);
      if (channel) {
        const webhook = await webhookFetch.find(channel);

        if (!webhook) {
          console.log("Welp didn't find a webhook, sry.");
          return;
        }

        const embeds = [];

        if (oldMember.isCommunicationDisabled() != member.isCommunicationDisabled()) {
            const fetchedLogs = await member.guild.fetchAuditLogs({
              type: AuditLogEvent.MemberUpdate,
              limit: 1,
            });
            const firstEntry = fetchedLogs.entries.first();

            const embed = new EmbedBuilder()
            .setAuthor({
              name: member.user.username,
              iconURL: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
            })
            .setDescription(member.isCommunicationDisabled() ? `${member} was timed out.\nDuration: **${await timeDifference(member.communicationDisabledUntil, new Date())}**` : `${member} timeout was removed.`)
            .setColor(Colors.Orange)
            .setTimestamp(new Date());

            if ((firstEntry.executorId != member.id && firstEntry.targetId == member.id) && ((Date.now() - firstEntry.createdTimestamp) < 5000)) {
              const executor = await this.container.client.users.fetch(
                firstEntry.executorId,
              ).catch(() => undefined);
              if (executor) embed.setDescription(
                    member.isCommunicationDisabled() ? `${executor} timed out ${member}.\nDuration: **${await timeDifference(member.communicationDisabledUntil, new Date())}**\n**Reason: **${firstEntry.reason || `No reason specified.`}`
                    : `${executor} removed ${member}'s timeout.\n**Reason: **${firstEntry.reason || `No reason specified.`}`
                )
                .setFooter({
                  text: executor.username,
                  iconURL: executor.displayAvatarURL({
                    dynamic: true,
                    size: 256,
                  }),
              })
            }

            embeds.push(embed);
        }

        if (embeds.length == 0) return;

        await webhook
          .send({
            // content: '',
            username: this.container.client.user.username,
            avatarURL: this.container.client.user.displayAvatarURL({
              extension: "png",
              size: 512,
            }),
            embeds: embeds,
          })
          .catch((err) =>
            console.error(`[error] Error on sending webhook`, err),
          );
      }
    }
  }
}
module.exports = {
  GuildMemberAdd,
};
