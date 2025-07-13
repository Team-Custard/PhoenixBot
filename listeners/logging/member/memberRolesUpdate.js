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
      name: "loggerMemberRolesUpdate",
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
    if (db.logging.roles) {
      const channel = await member.guild.channels
        .fetch(db.logging.roles)
        .catch(() => undefined);
      if (channel) {
        const webhook = await webhookFetch.find(channel);

        if (!webhook) {
          console.log("Welp didn't find a webhook, sry.");
          return;
        }

        let embeds = [];

        if (oldMember.roles.cache.size != member.roles.cache.size) {
            const fetchedLogs = await member.guild.fetchAuditLogs({
              type: AuditLogEvent.MemberRoleUpdate,
              limit: 1,
            });
            const firstEntry = fetchedLogs.entries.first();
            
            const addRoles = member.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
            const removedRoles = oldMember.roles.cache.filter(r => !member.roles.cache.has(r.id));

            const embed = new EmbedBuilder()
            .setAuthor({
              name: member.user.username,
              iconURL: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
            })
            .setDescription(`${member} roles updated${addRoles.size ? '\n**Added:** '+ addRoles.map(r => r) : ``}${removedRoles.size ? '\n**Removed:** '+ removedRoles.map(r => r) : ``}`)
            .setColor(Colors.Orange)
            .setTimestamp(new Date());

            if ((firstEntry.executorId != member.id && firstEntry.targetId == member.id) && ((Date.now() - firstEntry.createdTimestamp) < 5000)) {
              const executor = await this.container.client.users.fetch(
                firstEntry.executorId,
              ).catch(() => undefined);
              if (executor) embed.setDescription(
                `${executor} updated ${member}'s roles${addRoles.size ? '\n**Added:** '+ addRoles.map(r => r) : ``}${removedRoles.size ? '\n**Removed:** '+ removedRoles.map(r => r) : ``}\n**Reason:** ${firstEntry.reason || `No reason specified.`}`,
              ).setFooter({
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
