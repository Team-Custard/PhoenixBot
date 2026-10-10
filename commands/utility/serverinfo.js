const { PermissionFlagsBits, EmbedBuilder, Colors } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");
const premiumCheck = require("../../tools/premiumCheck");

const EMOJI_LIMITS = [50, 100, 150, 250];

class ServerInfoCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "serverinfo",
      aliases: ["si", "server", "guildinfo"],
      description: "Displays info about this server, or another server by id.",
      examples: ["serverinfo", "serverinfo 1251025316701405284"],
      args: [
        { name: "server", type: "string", maxLength: 25, description: "A server id to look up (defaults to this server)" },
        { name: "widget", type: "boolean", aliases: ["w"], description: "Fall back to the server widget if needed" },
      ],
      slash: { name: "server_info" },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
      preconditions: ["module"],
    });
  }

  async run(ctx, { server, widget }) {
    await ctx.defer();
    const id = server ?? ctx.guild.id;
    const client = this.container.client;
    const guild = id === ctx.guild.id ? ctx.guild : await client.guilds.fetch(id).catch(() => undefined);

    if (guild) return ctx.reply({ embeds: [await this.guildEmbed(guild)] });

    const preview = await client.fetchGuildPreview(id).catch(() => undefined);
    if (preview) {
      return ctx.reply({
        embeds: [
          base(preview.name, preview.iconURL({ size: 512 }))
            .setDescription([
              `**Name:** ${preview.name}`,
              `**ID:** ${preview.id}`,
              `**Created:** <t:${Math.floor(preview.createdTimestamp / 1000)}:R>`,
              `**Users:** ${preview.approximateMemberCount}`,
              `**Emojis:** ${preview.emojis.size}`,
              `**Stickers:** ${preview.stickers.size}`,
              "",
              "**Fetched method:** Discovery",
            ].join("\n")),
        ],
      });
    }

    if (!widget) {
      return ctx.reply(`${emoji("error")} Couldn't display the server information. The server must be discoverable or have Phoenix in it. Phoenix can also try the server widget with the widget option, but it's not recommended.`);
    }
    const fetchedWidget = await client.fetchGuildWidget(id).catch(() => undefined);
    if (!fetchedWidget) {
      return ctx.reply(`${emoji("error")} Couldn't display the server information. The server must be discoverable, have its widget enabled, or have Phoenix in it.`);
    }
    return ctx.reply({
      embeds: [
        base(fetchedWidget.name).setDescription(`**Name:** ${fetchedWidget.name}\n**ID:** ${fetchedWidget.id}\n\n**Fetched method:** Widget`),
      ],
    });
  }

  async guildEmbed(guild) {
    const staticEmojis = guild.emojis.cache.filter((e) => !e.animated).size;
    return base(guild.name, guild.iconURL({ size: 512 }))
      .setDescription([
        `**Name:** ${guild.name}`,
        `**ID:** ${guild.id}`,
        `**Owner:** <@${guild.ownerId}>`,
        `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
        `**Shard:** ${guild.shardId}`,
        `**Premium:** ${(await premiumCheck(guild).catch(() => false)) ? emoji("success") : emoji("error")}`,
        "",
        `**Users:** ${guild.memberCount} / ${guild.maximumMembers ?? "?"}`,
        `**Roles:** ${guild.roles.cache.size} / 250`,
        `**Channels:** ${guild.channels.cache.size} / 500`,
        `**Emojis:** ${staticEmojis} / ${EMOJI_LIMITS[guild.premiumTier] ?? 50}`,
        `**Boosts:** ${guild.premiumSubscriptionCount ?? 0} (Level ${guild.premiumTier})`,
        "",
        `**Verification:** ${guild.verificationLevel} / 4`,
        `**Explicit filter:** ${guild.explicitContentFilter} / 2`,
        `**Notifications:** ${guild.defaultMessageNotifications === 1 ? "@mention" : "all"}`,
      ].join("\n"))
      .setThumbnail(guild.iconURL({ size: 512 }));
  }
}

function base(name, iconURL) {
  return new EmbedBuilder()
    .setAuthor({ name, iconURL: iconURL ?? undefined })
    .setColor(Colors.Orange)
    .setFooter({ text: "Triggered" })
    .setTimestamp(new Date());
}

module.exports = { ServerInfoCommand };
