const { container } = require("@sapphire/framework");
const Infractions = require("./InfractionSchema");
const serverSettings = require("../../tools/SettingsSchema");
const { Collection, GuildMember } = require("discord.js");

const infractionlist = [];

/**
 * Initializes the infraction store.
 */
exports.init = async () => {
    const infractions = await Infractions.getById("0").cacheQuery();
    for (const i in infractions.timers) {
        const inf = {
            id: infractions[i].id,
            memberid: infractions[i].memberId,
            guildid: infractions[i].guildId,
            punishment: infractions[i].punishment,
            expire: infractions[i].expire,
        }
        const expire = setTimeout(this.expire(inf), inf.expire)
        infractionlist.push({
            id: i,
            inf: inf,
            exp: expire
        })
    }
}

/**
 * Starts a temporary punishment
 * @param {*} punishment 
 */
exports.start = async (punishment) => {
    const infractions = await Infractions.getById("0").cacheQuery();
    const inf = {
        id: punishment.punishment,
        memberid: punishment.memberId,
        guildid: punishment.guildId,
        punishment: punishment.punishment,
        expire: punishment.expire,
    }
    const expire = setTimeout(this.expire(inf, container.client.user,`Time's up`), inf.expire)
    infractionlist.push({
        id: i,
        inf: inf,
        exp: expire
    })
}

/**
 * Expires a temporary punishment.
 * @param {*} punishment The infraction.
 * @returns {*} Returns a console log.
 */
exports.expire = async (pun) => {
    const punishment = pun.inf;
    if (punishment.punishment == "ban") {
        const guild = await container.client.guilds.fetch(punishment.guildid).catch(() => undefined);
        if (!guild) return console.log(`[Error] Failed executing temp-punishment ${punishment.id}. Server not found.`);
        guild.bans.remove(punishment.memberid, `(${container.client.user.tag}) Time's up.`);
        if (db.logging.infractions) {
            const channel = await message.guild.channels
              .fetch(db.logging.infractions)
              .catch(() => undefined);
            if (channel) {
              const embedT = new EmbedBuilder()
                .setTitle(`Unban`)
                .setDescription(
                  `**Offender:** <@${punishment.memberid}>\n**Moderator:** ${container.client.user}\n**Reason:** Time's up.`,
                )
                .setColor(Colors.Orange)
                .setFooter({ text: `ID ${punishment.memberid}` })
                .setTimestamp(new Date());
      
              const msg = await channel
                .send({
                  // content: '',
                  embeds: [embedT],
                })
                .catch((err) => {
                  console.error(`[error] Error on sending to channel`, err);
                  return undefined;
                });
              if (msg) thecase.modlogID = msg.id;
            }
          }
    }
    else {
        console.log(`[Error] Not executing temp-punishment ${punishment.id}. Invalid punishment.`)
    }
}

/**
 * Cancels a punishment
 * @param {GuildMember} member The member to search for.
 * @param {string} inftype The type of infraction.
 * @returns {undefined} Returns nothing.
 */
exports.cancel = async (member, inftype) => {
    const punishment = infractionlist.find(l => l.inf.memberid == member.id && l.inf.punishment == inftype);
    if (!punishment) return;
    clearTimeout(punishment.exp);
    infractionlist.splice(punishment.id, 1);
}