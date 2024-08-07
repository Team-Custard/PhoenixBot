const { ScheduledTask } = require('@sapphire/plugin-scheduled-tasks');
const { EmbedBuilder, Colors } = require('discord.js');
const serverSettings = require("../tools/SettingsSchema");

class ManualTask extends ScheduledTask {
    constructor(context, options) {
        super(context, {
            ...options
        });
    }
    async run(payload) {
        console.log(payload);
        const guild = await this.container.client.guilds.fetch(payload.guildid)
        .catch((err) => { throw err; });
        if (!guild) return console.log(`Error processing unban.`)
        guild.bans.remove(payload.memberid, `Automatic unban`)
        .then(async () => {
            console.log(`Successfully processed unbanned`);
            const db = await serverSettings
            .findById(guild.id, serverSettings.upsert)
            .cacheQuery();
            if (db?.logging?.infractions) {
                const channel = await guild.channels
                  .fetch(db.logging.infractions)
                  .catch(() => undefined);
                if (channel) {
                  const embed = new EmbedBuilder()
                    .setTitle(`Unban`)
                    .setDescription(
                      `**Offender:** <@${payload.memberid}>\n**Moderator:** ${this.container.client.user}\n**Reason:** Automatic unban`,
                    )
                    .setColor(Colors.Orange)
                    .setFooter({ text: `ID ${payload.memberid}` })
                    .setTimestamp(new Date());
          
                  const msg = await channel
                    .send({
                      // content: '',
                      embeds: [embed],
                    })
                    .catch((err) => {
                      console.error(`[error] Error on sending to channel`, err);
                      return undefined;
                    });
                }
              }
        })
        .catch(() => console.log(`Automatic unban failed`));
    }
}

module.exports = {
    ManualTask,
}