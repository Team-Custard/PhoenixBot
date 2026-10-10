const fs = require("fs");
const path = require("path");
const { PermissionFlagsBits, EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { PaginatedMessage } = require("@sapphire/discord.js-utilities");
const { emojibarv2 } = require("emoji-progressbar");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { getSettings } = require("../../tools/guildSettings");
const { emoji } = require("../../tools/errorReporter");
const { confirm } = require("../../tools/warningEmbed");
const { LevelMember, xpForLevel, getRank, getLeaderboard } = require("../../tools/leveling");
const { dashboard } = require("../../tools/config");

const RANKCARD_DIR = path.join(__dirname, "../../static/rankcards");
const PAGE_SIZE = 10;
const BAR = [
  "<:caw_bar_xo:1321053069777174560>", "<:caw_bar_xo:1321053069777174560>", "<:caw_bar_xi:1321053716186529803>",
  "<:caw_bar_oo:1321055114718609408>", "<:caw_bar_io:1321053105810444369>", "<:caw_bar_io:1321053105810444369>",
  "<:caw_bar_ii:1321053135221035038>", "<:caw_bar_ox:1321053007361605642>", "<:caw_bar_ix:1321054189836701758>",
  "<:caw_bar_ix:1321054189836701758>",
];

class LevelingCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "leveling",
      aliases: ["lvl", "level", "rank"],
      description: "Levels and the leaderboard. Leveling settings are on the dashboard.",
      examples: ["rank", "rank sylveondev", "leveling leaderboard", "leveling set_level sylveondev 10"],
      subcommands: [
        {
          name: "rank",
          description: "Shows someone's level",
          default: true,
          run: "rank",
          args: [{ name: "member", type: "member", description: "Whose level to show (defaults to you)" }],
        },
        { name: "leaderboard", aliases: ["lb", "top"], description: "Links to the server's leaderboard page", run: "leaderboard" },
        {
          name: "set_level",
          description: "Sets a member's level (Manage Server)",
          run: "setLevel",
          args: [
            { name: "member", type: "member", required: true, description: "The member" },
            { name: "level", type: "integer", required: true, minValue: 0, maxValue: 10_000, description: "The new level" },
          ],
        },
        {
          name: "clear",
          description: "Resets a member's level back to zero (Manage Server)",
          run: "clearMember",
          args: [{ name: "member", type: "member", required: true, description: "The member to reset" }],
        },
        { name: "clear_all", description: "Resets everyone's level in this server (Manage Server)", run: "clearAll" },
      ],
      cooldownDelay: 5_000,
      preconditions: ["module"],
    });
  }

  requireManager(ctx) {
    if (ctx.member.permissions.has(PermissionFlagsBits.ManageGuild)) return null;
    return ctx.reply(`${emoji("error")} Only members with \`Manage Server\` can do this.`);
  }

  async rank(ctx, { member }) {
    member = member ?? ctx.member;
    await ctx.defer();
    const [settings, entry] = await Promise.all([
      getSettings(ctx.guild.id),
      LevelMember.findOne({ guildId: ctx.guild.id, userId: member.id }).lean(),
    ]);
    if (!entry) return ctx.reply(`${emoji("info")} No level exists for this user yet. Keep chatting to gain levels.`);

    const rank = await getRank(ctx.guild.id, entry);
    const required = xpForLevel(entry.level);

    if (settings.leveling?.useEmbed) {
      const embed = new EmbedBuilder()
        .setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL() })
        .setThumbnail(member.displayAvatarURL())
        .setColor(Colors.Orange)
        .setTimestamp(new Date())
        .setDescription(`**Level ${entry.level}**\n-# Rank ${rank}\n${emojibarv2(...BAR, entry.xp, required, 10)}\n${entry.xp} / ${required}xp`);
      return ctx.reply({ embeds: [embed] });
    }

    const { RankCardBuilder, Font } = require("canvacord");
    const background = await fs.promises.readFile(path.join(RANKCARD_DIR, `${ctx.guild.id}-rankcard.png`)).catch(() => null);
    Font.loadDefault();
    const card = new RankCardBuilder()
      .setUsername(member.user.username)
      .setDisplayName(member.displayName)
      .setAvatar(member.displayAvatarURL({ extension: "png", forceStatic: true, size: 512 }))
      .setCurrentXP(entry.xp)
      .setRequiredXP(required)
      .setBackground(background)
      .setOverlay(settings.leveling?.backgroundTransparency ?? 90)
      .setRank(rank)
      .setStatus(member.presence?.status)
      .setLevel(entry.level);
    return ctx.reply({ files: [await card.build({ format: "png" })] });
  }

  async leaderboard(ctx) {
    await ctx.defer();
    const total = await LevelMember.countDocuments({ guildId: ctx.guild.id });
    if (total === 0) {
      return ctx.reply(`${emoji("error")} Oh no, there is no leaderboard yet! Don't worry, there'll be one once someone starts talking.`);
    }
    const own = await LevelMember.findOne({ guildId: ctx.guild.id, userId: ctx.user.id }).lean();
    const ownRank = own ? await getRank(ctx.guild.id, own) : null;
    const settings = await getSettings(ctx.guild.id);

    // Public leaderboards live on the website now; the command shows the top 5 and links there.
    if (settings.leveling?.enable && settings.leveling.publicLeaderboard !== false) {
      const url = `${dashboard.baseUrl}/leaderboard/${ctx.guild.id}`;
      const top = await getLeaderboard(ctx.guild.id, { limit: 5 });
      const medals = ["🥇", "🥈", "🥉"];
      const lines = top.map((r, i) => `${medals[i] ?? `\` ${i + 1} \``} <@${r.userId}> · level ${r.level}`);
      const embed = new EmbedBuilder()
        .setAuthor({ name: `${ctx.guild.name} leaderboard`, iconURL: ctx.guild.iconURL() ?? undefined })
        .setDescription(`${lines.join("\n")}\n\n${ownRank ? `You're ranked **#${ownRank}** of ${total}.` : "You aren't ranked yet. Keep chatting!"}\n[See the full leaderboard](${url})`)
        .setColor(Colors.Orange);
      // Discord may refuse link buttons to localhost, so only add one for real sites.
      const components = url.startsWith("https://")
        ? [new ActionRowBuilder().addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Open leaderboard").setURL(url))]
        : [];
      return ctx.reply({ embeds: [embed], components, allowedMentions: { parse: [] } });
    }

    // Only the top 100 are paged through, so huge servers don't load everyone.
    const top = await getLeaderboard(ctx.guild.id, { limit: 100 });
    const pages = [];
    for (let i = 0; i < top.length; i += PAGE_SIZE) {
      const lines = top
        .slice(i, i + PAGE_SIZE)
        .map((r, index) => `\` ${i + index + 1} \` <@${r.userId}> : lvl ${r.level}\n> ${r.xp} / ${xpForLevel(r.level)} xp`);
      pages.push(
        new EmbedBuilder()
          .setAuthor({ name: ctx.guild.name, iconURL: ctx.guild.iconURL() ?? undefined })
          .setDescription(`${i === 0 ? `${ownRank ? `You are ranked \`${ownRank}\`` : "You aren't ranked yet"} on the leaderboard.\n\n` : ""}${lines.join("\n")}`)
          .setColor(Colors.Orange)
          .setTimestamp(new Date()),
      );
    }
    if (pages.length === 1) return ctx.reply({ embeds: pages });
    const paginated = new PaginatedMessage();
    for (const page of pages) paginated.addPageEmbed(page);
    return paginated.run(ctx.source, ctx.user);
  }

  async setLevel(ctx, { member, level }) {
    const denied = this.requireManager(ctx);
    if (denied) return denied;
    await LevelMember.updateOne(
      { guildId: ctx.guild.id, userId: member.id },
      { $set: { level, xp: 0 } },
      { upsert: true },
    );
    return ctx.reply(`${emoji("success")} Set **${member.user.tag}**'s level to \` ${level} \` successfully.`);
  }

  async clearMember(ctx, { member }) {
    const denied = this.requireManager(ctx);
    if (denied) return denied;
    const result = await LevelMember.updateOne({ guildId: ctx.guild.id, userId: member.id }, { $set: { level: 0, xp: 0 } });
    if (result.matchedCount === 0) return ctx.reply(`${emoji("error")} This user does not have a level yet.`);
    return ctx.reply(`${emoji("success")} Reset ${member.user.tag}'s level.`);
  }

  async clearAll(ctx) {
    const denied = this.requireManager(ctx);
    if (denied) return denied;
    const confirmed = await confirm(ctx, "This will reset **everyone's** level in this server. This can't be undone. Continue?");
    if (!confirmed) return undefined;
    const result = await LevelMember.deleteMany({ guildId: ctx.guild.id });
    return ctx.reply(`${emoji("success")} Cleared the server's levels (${result.deletedCount} members).`);
  }
}

module.exports = { LevelingCommand };
