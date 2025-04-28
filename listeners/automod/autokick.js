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
    if (db.automod.autokick.duration) {
        await this.container.tasks.create({ name: 'autoKick', payload: { guildid: member.guild.id, memberid: member.id } }, { delay: db.automod.autokick.duration, customJobOptions: { removeOnComplete: true, removeOnFail: true } })
        .then(() => { console.log(`Successfully registered a autoKick task`) })

        //console.log(await this.container.tasks.list({ types: ["active", "delayed", "waiting"] }))
    }
  }
}
module.exports = {
  GuildMemberAdd,
};
