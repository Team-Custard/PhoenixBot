const { Listener } = require("@sapphire/framework");
const { AuditLogEvent } = require("discord.js");
const { peekSettings } = require("../../../tools/guildSettings");
const { sendLog, logEmbed, findExecutor, withExecutor, logChannelId, truncate } = require("../../../tools/logging");

class LoggerRolesUpdate extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "guildMemberUpdate", name: "loggerRolesUpdate" });
  }

  async run(oldMember, member) {
    if (oldMember.partial) return;
    const added = member.roles.cache.filter((r) => !oldMember.roles.cache.has(r.id));
    const removed = oldMember.roles.cache.filter((r) => !member.roles.cache.has(r.id));
    if (added.size === 0 && removed.size === 0) return;

    const settings = await peekSettings(member.guild.id);
    if (!logChannelId(settings, "roles")) return;

    const changes = [
      added.size ? `**Added:** ${truncate(added.map((r) => `${r}`).join(", "), 1500)}` : null,
      removed.size ? `**Removed:** ${truncate(removed.map((r) => `${r}`).join(", "), 1500)}` : null,
    ].filter(Boolean).join("\n");

    const embed = logEmbed(member.user, `${member} roles updated\n${changes}`);
    const audit = await findExecutor(member.guild, AuditLogEvent.MemberRoleUpdate, member.id);
    if (audit) {
      withExecutor(embed, audit.executor).setDescription(
        `${audit.executor} updated ${member}'s roles\n${changes}\n**Reason:** ${audit.reason || "No reason specified."}`,
      );
    }
    return sendLog(member.guild, "roles", { embeds: [embed] }, settings);
  }
}

module.exports = { LoggerRolesUpdate };
