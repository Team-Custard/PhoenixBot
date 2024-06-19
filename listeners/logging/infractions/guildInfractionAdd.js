const { Listener } = require("@sapphire/framework");
const { isGuildBasedChannel } = require("@sapphire/discord.js-utilities");
const ServerSettings = require("../../../tools/SettingsSchema");
const { EmbedBuilder, Colors } = require("discord.js");
const webhookFetch = require("../../../tools/webhookFetch");

class GuildMemberAdd extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "guildInfractionAdd",
    });
  }
  async run(guild, mod, offender, thecase) {
    const db = await ServerSettings.findById(guild.id).cacheQuery();
    if (db.logging.infractions) {
      const channel = await guild.channels
        .fetch(db.logging.infractions)
        .catch(() => undefined);
      if (channel) {
        const embed = new EmbedBuilder()
          .setTitle(`${thecase.punishment} - Case ${thecase.id}`)
          .setDescription(
            `**Offender:** ${offender}\n**Moderator:** ${mod}\n**Reason:** ${thecase.reason}`,
          )
          .setColor(Colors.Orange)
          .setFooter({text: `ID ${offender.id}`})
          .setTimestamp(new Date());

        await channel
          .send({
            // content: '',
            embeds: [embed]
          })
          .catch((err) =>
            console.error(`[error] Error on sending to channel`, err),
          );
      }
    }
  }
}
module.exports = {
  GuildMemberAdd,
};
