const { Listener } = require("@sapphire/framework");
const { sendLog, logEmbed } = require("../../../tools/logging");

class LoggerMemberAdd extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "guildMemberAdd", name: "loggerMemberAdd" });
  }

  run(member) {
    const embed = logEmbed(member.user, `${member} joined\nCreated <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`)
      .setThumbnail(member.user.displayAvatarURL({ size: 1024 }));
    return sendLog(member.guild, "members", { embeds: [embed] });
  }
}

module.exports = { LoggerMemberAdd };
