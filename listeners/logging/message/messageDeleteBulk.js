const { Listener } = require("@sapphire/framework");
const { isGuildBasedChannel } = require("@sapphire/discord.js-utilities");
const ServerSettings = require("../../../tools/SettingsSchema");
const {
  EmbedBuilder,
  Colors,
  AuditLogEvent,
  AttachmentBuilder,
} = require("discord.js");
const webhookFetch = require("../../../tools/webhookFetch");

class GuildMemberAdd extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "messageDeleteBulk",
    });
  }
  async run(messages, gchannel) {
    if (!isGuildBasedChannel(gchannel)) return;
    if (this.container.client.id == "1239263616025493504") {
      const hasStaging = await gchannel.guild.members
        .fetch("1227318291475730443")
        .catch(() => undefined);
      if (hasStaging) return;
    }

    const db = await ServerSettings.findById(gchannel.guild.id).cacheQuery();
    if (db.logging.messages) {
      const channel = await gchannel.guild.channels
        .fetch(db.logging.messages)
        .catch(() => undefined);
      if (channel) {
        const webhook = await webhookFetch.find(channel);

        if (!webhook) {
          console.log("Welp didn't find a webhook, sry.");
          return;
        }

        const fetchedLogs = await gchannel.guild.fetchAuditLogs({
          type: AuditLogEvent.MessageBulkDelete,
          limit: 1,
        });

        const firstEntry = fetchedLogs.entries.first();
        const executor = await this.container.client.users.fetch(
          firstEntry.executorId,
        );

        const items = [];
        for (let i = 0; i < messages.size; i++) {
          console.log(messages.at(i));
          if (messages.at(i).partial) {
            items.push(`(Unfetched message)`);
          } else {
            items.unshift(
              `[${messages.at(i).author.tag}]: ${messages.at(i).content}`,
            );
          }
        }
        const itemFile = new AttachmentBuilder()
          .setFile(Buffer.from(items.join(`\n`), "utf-8"))
          .setName("messageLog.txt");

        const embed = new EmbedBuilder()
          .setAuthor({
            name: executor.username,
            iconURL: executor.displayAvatarURL({ dynamic: true, size: 256 }),
          })
          .setDescription(
            `${executor} purged ${firstEntry.extra.count} messages in ${gchannel}.\n${messages.size}/${firstEntry.extra.count} messages were logged.`,
          )
          .setColor(Colors.Orange)
          .setTimestamp(new Date());

        await webhook
          .send({
            // content: '',
            username: this.container.client.user.username,
            avatarURL: this.container.client.user.displayAvatarURL({
              extension: "png",
              size: 512,
            }),
            embeds: [embed],
            files: [itemFile],
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
