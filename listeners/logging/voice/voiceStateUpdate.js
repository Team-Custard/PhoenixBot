const { Listener } = require("@sapphire/framework");
const ServerSettings = require("../../../tools/SettingsSchema");
const { EmbedBuilder, Colors, Events, VoiceState } = require("discord.js");
const webhookFetch = require("../../../tools/webhookFetch");

class GuildMemberAdd extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: Events.VoiceStateUpdate,
      name: "loggerVoiceUpdate",
    });
  }
  /**
   * 
   * @param {VoiceState} oldState 
   * @param {VoiceState} newState 
   * @returns 
   */
  async run(oldState, newState) {
    if (oldState.member.partial) return;
    if (this.container.client.id == "1239263616025493504") {
      const hasStaging = await oldState.member.guild.members
        .fetch("1227318291475730443")
        .catch(() => undefined);
      if (hasStaging) return;
    }

    const db = await ServerSettings.findById(oldState.member.guild.id).cacheQuery();

    if (db.logging.voice) {
      const channel = await oldState.member.guild.channels
        .fetch(db.logging.voice)
        .catch(() => undefined);
      if (channel) {
        const webhook = await webhookFetch.find(channel);

        if (!webhook) {
          console.log("Welp didn't find a webhook, sry.");
          return;
        }

        if (!oldState.channel && newState.channel) {
            const embed = new EmbedBuilder()
            .setAuthor({
                name: oldState.member.user.username,
                iconURL: oldState.member.user.displayAvatarURL({ dynamic: true, size: 256 }),
            })
            .setDescription(
                `${oldState.member} joined voice channel ${newState.channel}`,
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
            })
            .catch((err) =>
                console.error(`[error] Error on sending webhook`, err),
            );
        }

        if (oldState.channel && !newState.channel) {
            const embed = new EmbedBuilder()
            .setAuthor({
                name: oldState.member.user.username,
                iconURL: oldState.member.user.displayAvatarURL({ dynamic: true, size: 256 }),
            })
            .setDescription(
                `${oldState.member} left voice channel ${oldState.channel}`,
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
            })
            .catch((err) =>
                console.error(`[error] Error on sending webhook`, err),
            );
        }

        if (oldState.channel && newState.channel && oldState.channel.id != newState.channel.id) {
            const embed = new EmbedBuilder()
            .setAuthor({
                name: oldState.member.user.username,
                iconURL: oldState.member.user.displayAvatarURL({ dynamic: true, size: 256 }),
            })
            .setDescription(
                `${oldState.member} transferred voice channels from ${oldState.channel} to ${newState.channel}`,
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
            })
            .catch((err) =>
                console.error(`[error] Error on sending webhook`, err),
            );
        }
        
      }
    }
  }
}
module.exports = {
  GuildMemberAdd,
};
