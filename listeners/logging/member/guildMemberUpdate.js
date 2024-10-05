const { Listener } = require("@sapphire/framework");
const ServerSettings = require("../../../tools/SettingsSchema");
const { EmbedBuilder, Colors, GuildMember, AuditLogEvent } = require("discord.js");
const webhookFetch = require("../../../tools/webhookFetch");

class GuildMemberAdd extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "guildMemberUpdate",
      name: "loggerMemberUpdate",
    });
  }

  /**
   * @param {GuildMember} oldMember 
   * @param {GuildMember} member 
   * @returns 
   */
  async run(oldMember, member) {
    if (member.partial) member = await member.fetch();
    if (this.container.client.id == "1239263616025493504") {
      const hasStaging = await member.guild.members
        .fetch("1227318291475730443")
        .catch(() => undefined);
      if (hasStaging) return;
    }

    const db = await ServerSettings.findById(member.guild.id).cacheQuery();
    if (db.logging.members) {
      const channel = await member.guild.channels
        .fetch(db.logging.members)
        .catch(() => undefined);
      if (channel) {
        const webhook = await webhookFetch.find(channel);

        if (!webhook) {
          console.log("Welp didn't find a webhook, sry.");
          return;
        }

        let embeds = [];

        if (oldMember.pending && !member.pending) {
            const embed = new EmbedBuilder()
            .setAuthor({
              name: member.user.username,
              iconURL: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
            })
            .setDescription(`${member} passed rule screening`)
            .setColor(Colors.Orange)
            .setTimestamp(new Date());
            embeds.push(embed);
        }

        if (oldMember.nickname != member.nickname) {
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
            .setDescription(`${member} nickname updated\n**New name:** ${member.nickname}\n**Old name:** ${oldMember.nickname}`)
            .setColor(Colors.Orange)
            .setTimestamp(new Date());

            if ((firstEntry.executorId != member.id && firstEntry.targetId == member.id) && ((Date.now() - firstEntry.createdTimestamp) < 5000)) {
              const executor = await this.container.client.users.fetch(
                firstEntry.executorId,
              ).catch(() => undefined);
              if (executor) embed.setDescription(
                    `${executor} updated ${member}'s nickname\n**New name:** ${member.nickname}\n**Old name:** ${oldMember.nickname}`
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
