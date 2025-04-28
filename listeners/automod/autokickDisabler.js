const { Listener } = require("@sapphire/framework");
const ServerSettings = require("../../tools/SettingsSchema");
const { EmbedBuilder, Colors, GuildMember, AuditLogEvent } = require("discord.js");
const webhookFetch = require("../../tools/webhookFetch");

class GuildMemberAdd extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "guildMemberUpdate",
      name: "automodAutokickDisabler",
    });
  }

  /**
   * @param {GuildMember} oldMember 
   * @param {GuildMember} member 
   * @returns 
   */
  async run(oldMember, member) {
    if (member.partial) member = await member.fetch();
    if (this.container.client.id == "1239263616025493504") {
      const hasStaging = await member.guild.members
        .fetch("1227318291475730443")
        .catch(() => undefined);
      if (hasStaging) return;
    }

    const db = await ServerSettings.findById(member.guild.id).cacheQuery();
    if (oldMember.roles.cache.size != member.roles.cache.size) {
        if (db.automod.autokick.neededRole) {
            if (member.roles.cache.has(db.automod.autokick.neededRole)) {
                const timer = (await this.container.tasks.list({types: ["delayed", "waiting", "prioritized"]})).find(t => t.name == 'autoKick' && t.data.guildid == member.guild.id && t.data.memberid == member.id);
                if (timer) {
                  timer.remove();
                  console.log('Removed autokick task');
                }
            }
        }
        else if (member.roles.cache.size > 1) {
            const timer = (await this.container.tasks.list({types: ["delayed", "waiting", "prioritized"]})).find(t => t.name == 'autoKick' && t.data.guildid == member.guild.id && t.data.memberid == member.id);
            if (timer) {
              timer.remove();
              console.log('Removed autokick task');
            }
        }
    }
  }
}
module.exports = {
  GuildMemberAdd,
};
