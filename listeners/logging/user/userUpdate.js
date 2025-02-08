const { Listener } = require("@sapphire/framework");
const ServerSettings = require("../../../tools/SettingsSchema");
const { EmbedBuilder, Colors, GuildMember, AuditLogEvent, Events, User, Client, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const webhookFetch = require("../../../tools/webhookFetch");
const { setTimeout } = require("node:timers/promises");

class GuildMemberAdd extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: Events.UserUpdate,
      name: "loggerUserUpdate",
    });
  }

  /**
   * 
   * @param {User} oldUser 
   * @param {User} user 
   */
  async run(oldUser, user) {
    if (user.partial) user = await user.fetch();

    const guilds = this.container.client.guilds.cache.filter(g => g.members.cache.find(m => m.id == user.id));

    for (let i = 0; guilds.size; i++) {
        await setTimeout(500);
        const guild = this.container.client.guilds.cache.at(i);
        const member = await guild?.members.cache.get(user.id);
        if (!member) continue;
        const db = await ServerSettings.findById(guild.id).cacheQuery();
        if (db.logging.users) {
            const channel = await guild.channels
            .fetch(db.logging.users)
            .catch(() => undefined);
            if (channel) {
                const webhook = await webhookFetch.find(channel);

                if (!webhook) {
                    console.log("Welp didn't find a webhook, sry.");
                    return;
                }

                let embeds = [];
                let attachments = [];
                let components = [];

                if (oldUser.username != user.username) {
                    const embed = new EmbedBuilder()
                    .setAuthor({
                        name: user.username,
                        iconURL: user.displayAvatarURL({ dynamic: true, size: 256 }),
                    })
                    .setDescription(`${user} updated their username.\n**Old username:** ${oldUser.username}\n**New username:** ${user.username}`)
                    .setColor(Colors.Orange)
                    .setTimestamp(new Date());
                    embeds.push(embed);
                }

                if (oldUser.avatar != user.avatar) {
                    let oldAvatar;
                    let newAvatar;
                    
                    if (oldUser.avatar) {
                        const avatarBuffer = await fetch(oldUser.displayAvatarURL({ size: 1024 })).then(async res => {
                            return await res.arrayBuffer();
                        })
                        oldAvatar = new AttachmentBuilder(Buffer.from(avatarBuffer),{
                            name: `oldavatar.${oldUser.displayAvatarURL().slice().split(".").reverse().at(0)}`
                        });
                        attachments.push(oldAvatar);
                    }
                    if (user.avatar) {
                        const avatarBuffer = await fetch(user.displayAvatarURL({ size: 1024 })).then(async res => {
                            return await res.arrayBuffer();
                        })
                        newAvatar = new AttachmentBuilder(Buffer.from(avatarBuffer),{
                            name: `newavatar.${user.displayAvatarURL().slice().split(".").reverse().at(0)}`
                        });
                        attachments.push(newAvatar);
                    }

                    const embed = new EmbedBuilder()
                    .setAuthor({
                        name: user.username,
                        iconURL: user.displayAvatarURL({ dynamic: true, size: 256 }),
                    })
                    .setURL(user.avatarURL({ size: 1024 }))
                    .setDescription(`${user} Avatar update!`)
                    .setColor(Colors.Orange)
                    .setThumbnail(`attachment://${newAvatar.name}`)
                    .setTimestamp(new Date());
                    const embedB = new EmbedBuilder()
                    .setURL(user.avatarURL({ size: 1024 }))
                    .setThumbnail(`attachment://${oldAvatar.name}`);
                    const embedC = new EmbedBuilder()
                    .setURL(user.avatarURL({ size: 1024 }))
                    .setThumbnail(`attachment://${newAvatar.name}`);

                    const c = new ActionRowBuilder()
                    .addComponents([
                        new ButtonBuilder()
                        .setCustomId(`displayAvatar-OLD`)
                        .setLabel('Old avatar')
                        .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                        .setCustomId(`displayAvatar-NEW`)
                        .setLabel('New avatar')
                        .setStyle(ButtonStyle.Secondary),
                    ])

                    embeds.push(embed, embedB, embedC);
                    components.push(c);
                }

                if (embeds.length == 0) return;

                await webhook
                .send({
                    // content: '',
                        username: this.container.client.user.username,
                        avatarURL: this.container.client.user.displayAvatarURL({
                        extension: "png",
                        size: 512,
                    }),
                    files: attachments.length > 0 ? attachments : null,
                    components: components.length > 0 ? components : null,
                    embeds: embeds,
                })
                .catch((err) =>
                    console.error(`[error] Error on sending webhook`, err),
                );
            }
        }

    }
  }
}
module.exports = {
  GuildMemberAdd,
};
