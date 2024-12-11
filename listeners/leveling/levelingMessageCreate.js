const { isGuildBasedChannel } = require("@sapphire/discord.js-utilities");
const { Listener, Events } = require("@sapphire/framework");
const ServerSettings = require("../../tools/SettingsSchema");
const calculateLevel = require('../../tools/xpToLevel');

const config = require("../../config.json");

const cooldowns = new Set();

const generateXP = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

class ReadyListener extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      name: "levelingMessageCreate",
      event: Events.MessageCreate,
    });
  }
  async run(message) {
    if (message.author.bot) return;
    if (!isGuildBasedChannel(message.channel)) return;
    if (!message.member) return;
    if (!message.member.id) return;
    if (cooldowns.has(message.author.id)) return;

    if (
      this.container.client.id == "1171286616967479377" ||
      this.container.client.id == "1239263616025493504"
    ) {
      const hasStaging = await message.guild.members
        .fetch("1227318291475730443")
        .catch(() => undefined);
      if (hasStaging) return;
    }
    
    const db = await ServerSettings.findById(message.guild.id).cacheQuery();
    if (!db.leveling.enable) return;

    if (message.content.startsWith(db.prefix)) return;

    const xpToGive = generateXP(5, 15);
    const level = db.leveling.users.find(u => u.id == message.author.id);

    if (level) {
        level.xp += xpToGive;

        if (level.xp > calculateLevel(level.level)) {
            level.xp = 0;
            level.level += 1;

            if (db.leveling.message) {
                if (db.leveling.announceChannel) {
                    await message.guild.channels.fetch(db.leveling.announceChannel)
                    .then(async (channel) => {
                        channel.send(await require('../../tools/textParser').parse(db.leveling.message, message.member, {
                            level: level.level
                        })).catch(() => undefined);
                    })
                    .catch(() => undefined);
                } 
                else message.channel.send(await require('../../tools/textParser').parse(db.leveling.message, message.member, {
                    level: level.level
                }))
                .catch(() => undefined);
            }
        }

        await db.save();
        cooldowns.add(message.author.id);
        setTimeout(() => {
            cooldowns.delete(message.author.id);
        }, 60_000);
    }
    else {
        db.leveling.users.push({
            id: message.author.id,
            level: 0,
            xp: xpToGive
        });
        await db.save();
        setTimeout(() => {
            cooldowns.delete(message.author.id);
        }, 60_000);
    }
  }
}
module.exports = {
  ReadyListener,
};
