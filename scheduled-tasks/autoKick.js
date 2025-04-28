const { ScheduledTask } = require('@sapphire/plugin-scheduled-tasks');
const { EmbedBuilder, Colors } = require('discord.js');
const serverSettings = require("../tools/SettingsSchema");

class ManualTask extends ScheduledTask {
    constructor(context, options) {
        super(context, {
            ...options,
            name: 'autoKick'
        });
    }

    /**
     * 
     * @param {import('@sapphire/plugin-scheduled-tasks').ScheduledTasksPayload} payload 
     * @returns 
     */
    async run(payload) {
        console.log(payload);
        const guild = await this.container.client.guilds.fetch(payload?.guildid)
        .catch((err) => { throw err; });
        if (!guild) return console.log(`Error processing autokick: No guild found`)
        const member = await guild.members.fetch(payload?.memberid)
        const db = await serverSettings
          .findById(guild.id, serverSettings.upsert)
          .cacheQuery();
        
        if (db.automod.autokick.neededRole && member.roles.cache.find(r => r.id == db.automod.autokick.neededRole)) return console.log("Not kicking member as they have the needed roles");
        else if (!db.automod.autokick.neededRole && member.roles.cache.size > 1) return console.log("Not kicking member as they have a role");

        await member.send(`${this.container.emojis.warning} You have been automatically kicked from **${guild.name}** for not getting your role on time.`).catch(() => undefined)
        member.kick(`Automod action for not getting a role on time`)
        .then(async () => {
            console.log(`Successfully processed autokick`);
            if (db?.logging?.infractions) {
                const channel = await guild.channels
                  .fetch(db.logging.infractions)
                  .catch(() => undefined);
                if (channel) {
                  const embedT = new EmbedBuilder()
                    .setTitle(`Kick (Automatic)`)
                    .setDescription(
                        `**Offender:** ${member}\n**Moderator:** ${this.container.client.user}\n**Reason:** Automod action for not getting a role on time`,
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
        .catch((err) => console.log(`Automatic autokick failed: ${err}`));
    }
}

module.exports = {
    ManualTask,
}