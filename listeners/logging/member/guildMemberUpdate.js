const { Listener } = require("@sapphire/framework");
const { AuditLogEvent } = require("discord.js");
const { peekSettings } = require("../../../tools/guildSettings");
const { sendLog, logEmbed, findExecutor, withExecutor, logChannelId } = require("../../../tools/logging");

// Logs rule screening and nickname changes.
class LoggerMemberUpdate extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "guildMemberUpdate", name: "loggerMemberUpdate" });
  }

  async run(oldMember, member) {
    // Without the old member we can't tell what changed.
    if (oldMember.partial) return;
    const screened = oldMember.pending && !member.pending;
    const renamed = oldMember.nickname !== member.nickname;
    if (!screened && !renamed) return;

    const settings = await peekSettings(member.guild.id);
    if (!logChannelId(settings, "members")) return;

    const embeds = [];
    if (screened) embeds.push(logEmbed(member.user, `${member} passed rule screening`));
    if (renamed) {
      const names = `**New name:** ${member.nickname}\n**Old name:** ${oldMember.nickname}`;
      const embed = logEmbed(member.user, `${member} nickname updated\n${names}`);
      const audit = await findExecutor(member.guild, AuditLogEvent.MemberUpdate, member.id);
      if (audit) {
        withExecutor(embed, audit.executor).setDescription(
          `${audit.executor} updated ${member}'s nickname\n${names}\n**Reason:** ${audit.reason || "No reason specified."}`,
        );
      }
      embeds.push(embed);
    }
    return sendLog(member.guild, "members", { embeds }, settings);
  }
}

module.exports = { LoggerMemberUpdate };
