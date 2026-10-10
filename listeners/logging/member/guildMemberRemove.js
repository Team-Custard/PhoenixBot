const { Listener } = require("@sapphire/framework");
const { sendLog, logEmbed, timeDifference, truncate } = require("../../../tools/logging");

class LoggerMemberRemove extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "guildMemberRemove", name: "loggerMemberRemove" });
  }

  run(member) {
    // Members that weren't cached arrive as partials without join date or roles.
    const lines = [`${member} left`];
    if (member.joinedTimestamp) lines.push(`Member for: **${timeDifference(Date.now(), member.joinedTimestamp)}**`);
    lines.push(`Created <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`);
    const roles = member.roles?.cache?.filter((r) => r.id !== member.guild.id).map((r) => `${r}`).join(", ");

    const embed = logEmbed(member.user, lines.join("\n"))
      .addFields({ name: "Roles:", value: truncate(roles, 1024) || "No roles found" })
      .setThumbnail(member.user.displayAvatarURL({ size: 1024 }));
    return sendLog(member.guild, "members", { embeds: [embed] });
  }
}

module.exports = { LoggerMemberRemove };
