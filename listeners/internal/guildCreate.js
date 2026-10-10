const { EmbedBuilder, ButtonStyle, ActionRowBuilder, ButtonBuilder, Colors } = require("discord.js");
const { Listener } = require("@sapphire/framework");
const fs = require("fs");
const db = require("../../tools/database");
const ServerSettings = require("../../tools/SettingsSchema");
const webhookFetch = require("../../tools/webhookFetch");
const config = require("../../config.json");

class GuildCreate extends Listener {
  constructor(context, options) {
    super(context, { ...options, event: "guildCreate" });
  }

  /** @param {import("discord.js").Guild} guild */
  async run(guild) {
    if (config.process.botmode === "custom") {
      // Custom bots may only be in the servers listed for them.
      const bots = JSON.parse(fs.readFileSync(require("../../custombot").list, "utf8"));
      const bot = bots.find((b) => b.token === this.container.client.token);
      if (!bot?.guild?.includes(guild.id)) return guild.leave();
    }
    await db.initGuildDatabase(guild.id);

    const settings = await ServerSettings.findById(guild.id).select("blacklisted").lean();
    if (settings?.blacklisted) {
      console.log(`Guild ${guild.id} is blacklisted. Leaving.`);
      return guild.leave();
    }

    if (!config.process.infowebhook || !process.env.infwebhookid) return undefined;
    const owner = await guild.fetchOwner().catch(() => null);
    const embed = new EmbedBuilder()
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ size: 256 }) ?? undefined })
      .setDescription(
        `**ID:** ${guild.id}\n**Members:** ${guild.memberCount}\n**Owner:** ${owner ?? guild.ownerId}\n` +
        `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>\n**Shard:** ${guild.shardId}`,
      )
      .setThumbnail(guild.iconURL({ size: 1024 }))
      .setColor(Colors.Orange)
      .setFooter({ text: "Added" })
      .setTimestamp(new Date());
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Primary).setLabel("Leave").setCustomId(`BOTADMIN-LeaveGuild-${guild.id}`),
      new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel("Blacklist").setCustomId(`BOTADMIN-BlacklistGuild-${guild.id}`),
    );
    return webhookFetch.send(process.env.infwebhookid, {
      username: this.container.client.user.username,
      avatarURL: this.container.client.user.displayAvatarURL({ size: 512, extension: "png" }),
      embeds: [embed],
      components: [row],
    });
  }
}

module.exports = { GuildCreate };
