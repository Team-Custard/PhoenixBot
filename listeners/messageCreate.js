const { Listener } = require('@sapphire/framework');
const UserDB = require('../tools/UserDB');

const afkCache = [];

class ReadyListener extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: 'messageCreate'
    });
  }
  async run(message) {
    if (afkCache.indexOf(message.member.id) != -1) {
        const usersettings = await UserDB.findById(message.member.id, UserDB.upsert).exec();

        usersettings.afk.since = null;
        usersettings.afk.status = null;
        await usersettings.save().then(() => {
        message.reply({ content: `Welcome back ${message.member}! I have cleared you afk status.` });
        }).catch((err) => {message.reply(`Welcome back ${message.member}!\nOops! I was unable to clear your afk status though. Error: ${err}`);});

        const cacheIndex = afkCache.indexOf(message.member.id);
        afkCache.splice(cacheIndex, 1);
    }

    if (message.inGuild() && !message.author.bot && message.mentions.members.size > 0) {
        if (message.mentions.members.size == 0) return;
        const member = message.mentions.members.first();
        const usersettings = await UserDB.findById(member.id, UserDB.upsert).exec();
        if (!usersettings) return;
        if (usersettings.afk.status) {
            if (member.id != message.member.id) {
                message.reply(`${member.user.username} is not available right now.\n\`${usersettings.afk.status}\` <t:${usersettings.afk.since}:R>`);

                if (afkCache.indexOf(member.id) == -1) afkCache.push(member.id);
            }
            else {
                usersettings.afk.since = null;
                usersettings.afk.status = null;
                await usersettings.save().then(() => {
                    message.reply({ content: `Welcome back ${message.member}! I have cleared you afk status.` });
                }).catch((err) => {message.reply(`Welcome back ${message.member}!\nOops! I was unable to clear your afk status though. Error: ${err}`);});
            }
        }
    }
  }
}
module.exports = {
  ReadyListener,
  afkCache
};