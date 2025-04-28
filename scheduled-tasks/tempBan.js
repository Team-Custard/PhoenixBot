const { ScheduledTask } = require('@sapphire/plugin-scheduled-tasks');
const { EmbedBuilder, Colors } = require('discord.js');
const serverSettings = require("../tools/SettingsSchema");

class ManualTask extends ScheduledTask {
    constructor(context, options) {
        super(context, {
            ...options,
            name: 'tempBan'
        });
    }
    async run(payload) {
        console.log(payload);
        const guild = await this.container.client.guilds.fetch(payload.guildid)
        .catch((err) => { throw err; });
        if (!guild) return console.log(`Error processing unban: No guild found`)
        const db = await serverSettings
          .findById(guild.id, serverSettings.upsert)
          .cacheQuery();
        
        const thecase = db.infractions.find((c) => c.id == payload.caseid);
        if (!thecase) return console.log(`Error processing unban: Invalid case (${payload.caseid})`);
        
        for (let i = 0; i < db.infractions.length; i++) {
          if (db.infractions[i].id == payload.caseid) {
            db.infractions[i].punishment = db.infractions[i].punishment + " (expired)"
            db.infractions[i].expired = true
          }
        }

        guild.bans.remove(payload.memberid, `Automatic unban`)
        .then(async () => {
            console.log(`Successfully processed unban`);
            await db.save();
            if (db?.logging?.infractions) {
                const channel = await guild.channels
                  .fetch(db.logging.infractions)
                  .catch(() => undefined);
                if (channel) {
                  const message = await channel.messages.fetch(thecase.modlogID).catch(() => undefined);
                  if (!message) return console.log(`Modlog message not found.`);
                  const embed = new EmbedBuilder(message.embeds[0])
                    .setTitle(`${thecase.punishment} - Case ${thecase.id}`);
          
                  await channel.messages
                    .fetch(thecase.modlogID)
                    .then(function (msg) {
                      console.log(thecase.modlogID);
                      msg.edit({ embeds: [embed] });
                    })
                    .catch(function (err) {
                      console.error(`[error] Error on sending to channel`, err);
                    });
                }
              }
        })
        .catch((err) => console.log(`Automatic unban failed: ${err}`));
    }
}

module.exports = {
    ManualTask,
}