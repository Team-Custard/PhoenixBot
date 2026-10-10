const { Listener } = require("@sapphire/framework");
const { AuditLogEvent } = require("discord.js");
const { peekSettings } = require("../../../tools/guildSettings");
const { sendLog, logEmbed, findExecutor, withExecutor, logChannelId } = require("../../../tools/logging");

class LoggerBanRemove extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "guildBanRemove", name: "loggerBanRemove" });
  }

  async run(ban) {
    const settings = await peekSettings(ban.guild.id);
    if (!logChannelId(settings, "moderation")) return;

    const embed = logEmbed(ban.user, `${ban.user} was unbanned.`);
    const audit = await findExecutor(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);
    if (audit) {
      withExecutor(embed, audit.executor).setDescription(
        `${audit.executor} unbanned ${ban.user}.${audit.reason ? `\n**Reason:** ${audit.reason}` : ""}`,
      );
    }
    return sendLog(ban.guild, "moderation", { embeds: [embed] }, settings);
  }
}

module.exports = { LoggerBanRemove };
