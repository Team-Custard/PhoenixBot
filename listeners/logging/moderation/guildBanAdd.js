const { Listener } = require("@sapphire/framework");
const { AuditLogEvent } = require("discord.js");
const { peekSettings } = require("../../../tools/guildSettings");
const { sendLog, logEmbed, findExecutor, withExecutor, logChannelId } = require("../../../tools/logging");

class LoggerBanAdd extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "guildBanAdd", name: "loggerBanAdd" });
  }

  async run(ban) {
    const settings = await peekSettings(ban.guild.id);
    if (!logChannelId(settings, "moderation")) return;

    const embed = logEmbed(ban.user, `${ban.user} was banned from the server.${ban.reason ? `\n**Reason:** ${ban.reason}` : ""}`);
    const audit = await findExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
    if (audit) {
      withExecutor(embed, audit.executor).setDescription(
        `${audit.executor} banned ${ban.user} from the server.${audit.reason ? `\n**Reason:** ${audit.reason}` : ""}`,
      );
    }
    return sendLog(ban.guild, "moderation", { embeds: [embed] }, settings);
  }
}

module.exports = { LoggerBanAdd };
