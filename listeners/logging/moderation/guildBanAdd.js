const { Listener } = require("@sapphire/framework");
const { isGuildBasedChannel } = require("@sapphire/discord.js-utilities");
const ServerSettings = require("../../../tools/SettingsSchema");
const { EmbedBuilder, Colors, AuditLogEvent, Events, GuildBan } = require("discord.js");
const webhookFetch = require("../../../tools/webhookFetch");

class GuildMemberAdd extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: Events.GuildBanAdd,
      name: `loggerBanAdd`
    });
  }
  /**
   * @param {GuildBan} ban
   */
  async run(ban) {
    console.log(`Ban added`);
    if (this.container.client.id == "1239263616025493504") {
      const hasStaging = await ban.guild.members
        .fetch("1227318291475730443")
        .catch(() => undefined);
      if (hasStaging) return;
    }

    const db = await ServerSettings.findById(ban.guild.id).cacheQuery();
    if (db.logging.moderation) {
      const channel = await ban.guild.channels
        .fetch(db.logging.moderation)
        .catch(() => undefined);
      if (channel) {
        const webhook = await webhookFetch.find(channel);

        if (!webhook) {
          console.log("Welp didn't find a webhook, sry.");
          return;
        }

        const embed = new EmbedBuilder()
          .setAuthor({
            name: ban.user.username,
            iconURL: ban.user.displayAvatarURL({
              dynamic: true,
              size: 256,
            }),
          })
          .setDescription(
            `${ban.user} was banned from the server.${ban.reason ? `\n**Reason:** ` + ban.reason : ``}`,
          )
          .setColor(Colors.Orange)
          .setTimestamp(new Date());

        const fetchedLogs = await ban.guild.fetchAuditLogs({
          type: AuditLogEvent.MemberBanAdd,
          limit: 1,
        });
        const firstEntry = fetchedLogs.entries.first();
        if (firstEntry.targetId == ban.user.id && ((Date.now() - firstEntry.createdTimestamp) < 5000)) {
          const executor = await this.container.client.users.fetch(
            firstEntry.executorId,
          ).catch(() => undefined);
          if (executor) embed.setDescription(
            `${executor} banned ${ban.user} from the server.${firstEntry.reason ? `\n**Reason:** ` + firstEntry.reason : ``}`,
          ).setFooter({
            text: executor.username,
            iconURL: executor.displayAvatarURL({
              dynamic: true,
              size: 256,
            }),
          })
        }


        await webhook
          .send({
            // content: '',
            username: this.container.client.user.username,
            avatarURL: this.container.client.user.displayAvatarURL({
              extension: "png",
              size: 512,
            }),
            embeds: [embed],
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
