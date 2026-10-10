const { Listener } = require("@sapphire/framework");
const { AuditLogEvent, AttachmentBuilder } = require("discord.js");
const { peekSettings } = require("../../../tools/guildSettings");
const { sendLog, logEmbed, logChannelId, isIgnoredChannel } = require("../../../tools/logging");

class LoggerMessageDeleteBulk extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "messageDeleteBulk", name: "loggerMessageDeleteBulk" });
  }

  async run(messages, channel) {
    if (!channel.guild) return;
    const settings = await peekSettings(channel.guild.id);
    if (!logChannelId(settings, "messages")) return;
    if (isIgnoredChannel(settings, channel)) return;

    // Oldest first.
    const lines = [...messages.values()]
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .map((m) => (m.partial ? "(Unfetched message)" : `[${m.author.tag}]: ${m.content}`));
    const file = new AttachmentBuilder(Buffer.from(lines.join("\n"), "utf-8"), { name: "messageLog.txt" });

    const logs = channel.guild.members.me?.permissions.has("ViewAuditLog")
      ? await channel.guild.fetchAuditLogs({ type: AuditLogEvent.MessageBulkDelete, limit: 1 }).catch(() => null)
      : null;
    const executor = logs?.entries.first()?.executor ?? null;

    const embed = logEmbed(executor, `${executor ?? "Someone"} purged ${messages.size} messages in ${channel}.`);
    return sendLog(channel.guild, "messages", { embeds: [embed], files: [file] }, settings);
  }
}

module.exports = { LoggerMessageDeleteBulk };
