const { Listener } = require("@sapphire/framework");
const { AuditLogEvent } = require("discord.js");
const { peekSettings } = require("../../../tools/guildSettings");
const { sendLog, logEmbed, findExecutor, withExecutor, logChannelId, timeDifference } = require("../../../tools/logging");

class LoggerTimeout extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "guildMemberUpdate", name: "loggerTimeout" });
  }

  async run(oldMember, member) {
    if (oldMember.partial) return;
    const timedOut = member.isCommunicationDisabled();
    if (oldMember.isCommunicationDisabled() === timedOut) return;

    const settings = await peekSettings(member.guild.id);
    if (!logChannelId(settings, "moderation")) return;

    const duration = timedOut ? timeDifference(member.communicationDisabledUntilTimestamp, Date.now()) : null;
    const embed = logEmbed(
      member.user,
      timedOut ? `${member} was timed out.\nDuration: **${duration}**` : `${member} timeout was removed.`,
    );
    const audit = await findExecutor(member.guild, AuditLogEvent.MemberUpdate, member.id);
    if (audit) {
      const reason = `**Reason: **${audit.reason || "No reason specified."}`;
      withExecutor(embed, audit.executor).setDescription(
        timedOut
          ? `${audit.executor} timed out ${member}.\nDuration: **${duration}**\n${reason}`
          : `${audit.executor} removed ${member}'s timeout.\n${reason}`,
      );
    }
    return sendLog(member.guild, "moderation", { embeds: [embed] }, settings);
  }
}

module.exports = { LoggerTimeout };
