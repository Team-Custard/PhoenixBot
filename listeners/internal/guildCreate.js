const { Guild, EmbedBuilder, ButtonStyle, ActionRowBuilder, ButtonBuilder, Colors } = require("discord.js");
const serverSettings = require("../../tools/SettingsSchema");
const { Listener } = require("@sapphire/framework");
const db = require("../../tools/database");
const fs = require('fs');

class GuildCreate extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: "guildCreate",
    });
  }

  /**
   * 
   * @param {Guild} guild 
   */
  async run(guild) {
    if (require("../../config.json").process.botmode == "custom") {
      const bots = JSON.parse(
        fs.readFileSync(require("../../custombot").list, "utf8"),
      );

      const foundToken = bots.find((b) => b.token == client.token);
      if (foundToken.guild.contains(guild.id)) db.initGuildDatabase(guild.id);
      else {
        guild.me.leave();
      }
    }
    else db.initGuildDatabase(guild.id);

    const bkcheck = await serverSettings
      .findById(guild.id, serverSettings.upsert)
      .cacheQuery();
    if (bkcheck?.blacklisted) {
      console.log(`Guild ${guild.id} is blacklisted. Leaving.`)
      return await guild.leave();
    }
    
    if (require('../../config.json').process.infowebhook) {
          const embed = new EmbedBuilder()
          .setAuthor({
            name: guild.name,
            iconURL: guild.iconURL({ size: 256 })
          })
          .setDescription(
            `**ID:** ${guild.id}\n`+
            `**Members:** ${guild.memberCount}\n`+
            `**Owner:** ${await guild.fetchOwner()}\n`+
            `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>\n`+
            `**Shard:** ${guild.shardId}`
          )
          .setThumbnail(guild.iconURL({ size: 1024 }))
          .setColor(Colors.Orange)
          .setFooter({ text: `Added` })
          .setTimestamp(new Date())
    
          const actionRow = new ActionRowBuilder()
          .addComponents(new ButtonBuilder()
            .setStyle(ButtonStyle.Primary)
            .setLabel(`Leave`)
            .setCustomId(`BOTADMIN-LeaveGuild-${guild.id}`),
            new ButtonBuilder()
            .setStyle(ButtonStyle.Danger)
            .setLabel(`Blacklist`)
            .setCustomId(`BOTADMIN-BlacklistGuild-${guild.id}`)
          )
    
          const channel = await this.container.client.channels.fetch(process.env["infwebhookid"])
          .catch(() => undefined);
          if (channel) {
            const webhook = await require('../../tools/webhookFetch').find(channel);
            if (webhook) webhook.send({
              username: this.container.client.user.username,
              avatarURL: this.container.client.user.displayAvatarURL({size: 512, extension: "png"}),
              embeds: [embed],
              components: [actionRow]
            }).then(() => console.log(`Webhook sent`))
            .catch(() => console.log(`Error while sending error webhook`));
          }
        }
  }
}
module.exports = {
  GuildCreate,
};
