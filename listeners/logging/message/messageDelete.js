const { Listener } = require("@sapphire/framework");
const { isGuildBasedChannel } = require("@sapphire/discord.js-utilities");
const ServerSettings = require("../../../tools/SettingsSchema");
const { EmbedBuilder, Colors, AuditLogEvent, Message } = require("discord.js");
const webhookFetch = require("../../../tools/webhookFetch");

class GuildMemberAdd extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "messageDelete",
    });
  }
  /**
   * @param {Message} message
   */
  async run(message) {
    if (message.partial) {
      // The message is a partial. Attempt to log it anyway.
      const recoveredchannel = await this.container.client.channels
        .fetch(message.channelId)
        .catch(() => undefined);
      if (!recoveredchannel) return console.log(`Unable to find log channel.`);
      const recoveredguild = recoveredchannel.guild;
      if (!isGuildBasedChannel(recoveredchannel)) return;
      const db = await ServerSettings.findById(message.guild.id).cacheQuery();
      if (db.logging.messages) {
        const channel = await recoveredguild.channels
          .fetch(db.logging.messages)
          .catch(() => undefined);
        if (channel) {
          const webhook = await webhookFetch.find(channel);

          if (!webhook) {
            console.log("Welp didn't find a webhook, sry.");
            return;
          }

          const embed = new EmbedBuilder()
            .setDescription(
              `A message was deleted in ${recoveredchannel} but I was unable to display info on the message.`,
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
              files: message.attachments.map((a) => a.toJSON()),
            })
            .catch((err) =>
              console.error(`[error] Error on sending webhook`, err),
            );
          return;
        }
      }
    }
    if (!isGuildBasedChannel(message.channel)) return;
    if (this.container.client.id == "1239263616025493504") {
      const hasStaging = await message.guild.members
        .fetch("1227318291475730443")
        .catch(() => undefined);
      if (hasStaging) return;
    }

    if (message.author?.bot) return;

    const db = await ServerSettings.findById(message.guild.id).cacheQuery();
    if (db.logging.messages) {
      const channel = await message.guild.channels
        .fetch(db.logging.messages)
        .catch(() => undefined);
      if (channel) {
        if (db.logging.msgignorechannels.includes(message.channel.id) || db.logging.msgignorechannels.includes(message.channel.parent?.id)) return;

        const webhook = await webhookFetch.find(channel);

        if (!webhook) {
          console.log("Welp didn't find a webhook, sry.");
          return;
        }

        const embed = new EmbedBuilder()
          .setAuthor({
            name: message.author.username,
            iconURL: message.author.displayAvatarURL({
              dynamic: true,
              size: 256,
            }),
          })
          .setDescription(
            `Message deleted in ${message.channel}\n**Message:**\n${message.content}`,
          )
          .setColor(Colors.Orange)
          .setTimestamp(new Date());

        const fetchedLogs = await message.guild.fetchAuditLogs({
          type: AuditLogEvent.MessageDelete,
          limit: 1,
        });
        const firstEntry = fetchedLogs.entries.first();
        if (firstEntry.targetId == message.author.id && ((Date.now() - firstEntry.createdTimestamp) < 5000)) {
          const executor = await this.container.client.users.fetch(
            firstEntry.executorId,
          ).catch(() => undefined);
          if (executor) embed.setDescription(
            `${executor} deleted ${message.author}'s message in ${message.channel}\n**Message:**\n${message.content}`,
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
            files: message.attachments.map((a) => a.toJSON()),
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
