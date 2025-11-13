const { Listener } = require("@sapphire/framework");
const ServerSettings = require("../../tools/SettingsSchema");
const { EmbedBuilder, Colors } = require("discord.js");
const webhookFetch = require("../../tools/webhookFetch");

class GuildMemberAdd extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "guildMemberAdd",
      name: "automodAutokick",
    });
  }
  async run(member) {
    if (member.partial) member = await member.fetch();
    if (this.container.client.id == "1239263616025493504") {
      const hasStaging = await member.guild.members
        .fetch("1227318291475730443")
        .catch(() => undefined);
      if (hasStaging) return;
    }

    const db = await ServerSettings.findById(member.guild.id).cacheQuery();

    if (db.automod.minimumAge) {
      const accountAge = Date.now() - member.user.createdTimestamp;
      if (accountAge < db.automod.minimumAge) {
        await member.send(`${this.container.emojis.warning} You have been automatically kicked from **${member.guild.name}** because your account is too new. You must be at least ${db.automod.minimumAge / 86400000} days old to join this server.`).catch(() => undefined);
                member.kick(`Automod action for minimum age.  Account age: ${Math.floor(accountAge / 86400000)} days, required: ${db.automod.minimumAge / 86400000} days.`)
                .then(async () => {
                    console.log(`Successfully processed minimum age kick`);
                    if (db?.logging?.infractions) {
                        const channel = await member.guild.channels
                          .fetch(db.logging.infractions)
                          .catch(() => undefined);
                        if (channel) {
                          const embedT = new EmbedBuilder()
                            .setTitle(`Kick (Automatic)`)
                            .setDescription(
                                `**Offender:** ${member}\n**Moderator:** ${this.container.client.user}\n**Reason:** Automod action for minimum age. Account age: ${Math.floor(accountAge / 86400000)} days, required: ${db.automod.minimumAge / 86400000} days.`,
                            )
                            .setColor(Colors.Orange)
                            .setFooter({ text: `ID ${member.id}` })
                            .setTimestamp(new Date());
                    
                            await channel
                            .send({
                                // content: '',
                                embeds: [embedT],
                            })
                            .catch((err) => {
                                console.error(`[error] Error on sending to channel`, err);
                                return undefined;
                            });
                        }
                      }
                })
                .catch((err) => console.log(`Automatic minimum age kick failed: ${err}`));
      }
    }

    if (db.automod.autokick.duration) {
        await this.container.tasks.create({ name: 'autoKick', payload: { guildid: member.guild.id, memberid: member.id } }, { delay: db.automod.autokick.duration, customJobOptions: { removeOnComplete: true, removeOnFail: false } })
        .then(() => { console.log(`Successfully registered a autoKick task`); });

        // console.log(await this.container.tasks.list({ types: ["active", "delayed", "waiting"] }))
    }
  }
}
module.exports = {
  GuildMemberAdd,
};
