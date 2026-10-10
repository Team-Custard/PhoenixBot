const { Listener } = require("@sapphire/framework");
const { sendLog, logEmbed } = require("../../../tools/logging");

class LoggerVoiceState extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "voiceStateUpdate", name: "loggerVoiceState" });
  }

  run(oldState, newState) {
    const member = newState.member ?? oldState.member;
    if (!member || oldState.channelId === newState.channelId) return undefined;

    let description;
    if (!oldState.channelId) description = `${member} joined voice channel ${newState.channel}`;
    else if (!newState.channelId) description = `${member} left voice channel ${oldState.channel}`;
    else description = `${member} transferred voice channels from ${oldState.channel} to ${newState.channel}`;

    return sendLog(newState.guild, "voice", { embeds: [logEmbed(member.user, description)] });
  }
}

module.exports = { LoggerVoiceState };
