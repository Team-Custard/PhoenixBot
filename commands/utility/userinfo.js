const {
  PermissionFlagsBits,
  EmbedBuilder,
  Colors,
  GuildMemberFlags,
  ApplicationCommandType,
  ApplicationIntegrationType,
  InteractionContextType,
} = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");
const { Case } = require("../../tools/moderation");

const ts = (ms) => `<t:${Math.floor(ms / 1000)}:R>`;

class UserInfoCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "userinfo",
      aliases: ["i", "info", "whois"],
      description: "Displays info about a user.",
      examples: ["userinfo", "userinfo sylveondev"],
      args: [{ name: "user", type: "user", description: "Who to look up (defaults to you)" }],
      contextMenus: [{ name: "Display info", type: ApplicationCommandType.User, run: "displayInfoMenu", contexts: [InteractionContextType.Guild] }],
      slash: {
        name: "display_info",
        integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
        contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
      },
      guildOnly: false,
      cooldownDelay: 3_000,
      preconditions: ["module"],
    });
  }

  async run(ctx, { user }) {
    await ctx.defer();
    const embed = await this.buildEmbed(user ?? ctx.user, ctx.guild, ctx.member);
    return ctx.reply({ embeds: [embed] });
  }

  async displayInfoMenu(interaction) {
    await interaction.deferReply();
    if (!interaction.guild) return interaction.editReply(`${emoji("error")} Unknown member.`);
    const embed = await this.buildEmbed(interaction.targetUser, interaction.guild, interaction.member);
    return interaction.editReply({ embeds: [embed] });
  }

  /**
   * @param {import("discord.js").User} user
   * @param {import("discord.js").Guild|null} guild The server it's used in (null for DMs / user installs).
   * @param {import("discord.js").GuildMember|null} viewer Who's asking, for permission-gated details.
   */
  async buildEmbed(user, guild, viewer) {
    const embed = new EmbedBuilder()
      .setAuthor({ name: user.displayName + (user.bot ? " [BOT]" : ""), iconURL: user.displayAvatarURL() })
      .setThumbnail(user.displayAvatarURL())
      .setColor(Colors.Orange)
      .setFooter({ text: "Triggered" })
      .setTimestamp(new Date());

    if (!guild) {
      return embed.setDescription(
        `**Tag:** ${user.tag}\n**ID:** ${user.id}\n**Account created:** ${ts(user.createdTimestamp)}\n-# *Userapps cannot view server data, so I can't show more info on this user. Invite Phoenix to the server to see more.*`,
      );
    }

    const canModerate = viewer?.permissions?.has?.(PermissionFlagsBits.ModerateMembers);
    const member = await guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      const ban = viewer?.permissions?.has?.(PermissionFlagsBits.BanMembers)
        ? await guild.bans.fetch(user.id).catch(() => null)
        : null;
      return embed.setDescription(
        `**Tag:** ${user.tag}\n**ID:** ${user.id}\n**Account created:** ${ts(user.createdTimestamp)}\n` +
        `${ban ? `**Banned:** *Yes*\n**Ban reason:** ${ban.reason || "No reason specified"}\n` : ""}Not in this server.`,
      );
    }

    const flags = member.flags;
    const lines = [
      `**Tag:** ${user.tag}`,
      member.nickname ? `**Nickname:** ${member.nickname}` : null,
      `**Display Name:** ${user.displayName}`,
      `**ID:** ${user.id}`,
      `**Joined server:** ${ts(member.joinedTimestamp)}`,
      `**Account created:** ${ts(user.createdTimestamp)}`,
      "",
      `**Roles:** ${member.roles.cache.filter((r) => r.id !== guild.id).map((r) => `${r}`).join(" ").slice(0, 1000) || "None"}`,
      `**Passed Onboarding:** ${flags.has(GuildMemberFlags.CompletedOnboarding) ? "Yes" : flags.has(GuildMemberFlags.StartedOnboarding) ? "Not yet, they started it" : "No"}`,
      `**Boosting:** ${member.premiumSinceTimestamp ? `Yes, started boosting ${ts(member.premiumSinceTimestamp)}` : "No"}`,
      `**Rejoined server:** ${flags.has(GuildMemberFlags.DidRejoin) ? "Yes" : "No"}`,
      `**Quarantined:** ${flags.has(GuildMemberFlags.AutomodQuarantinedBio) ? "Yes, bad bio" : flags.has(GuildMemberFlags.AutomodQuarantinedUsernameOrGuildNickname) ? "Yes, bad nickname" : "No"}`,
    ];

    if (canModerate && !user.bot) {
      const [latest, total] = await Promise.all([
        Case.findOne({ guildId: guild.id, member: user.id }).sort({ caseId: -1 }).lean(),
        Case.countDocuments({ guildId: guild.id, member: user.id }),
      ]);
      lines.push("", "**Latest infraction:**");
      lines.push(
        latest
          ? `\` ${latest.caseId} \` ${latest.punishment} by <@${latest.moderator}>\nReason: ${latest.reason}\n**${total}** total infractions.`
          : "No infractions found for this user.",
      );
    }

    return embed
      .setDescription(lines.filter((l) => l !== null).join("\n"))
      .setColor(member.roles.highest.color || Colors.Orange);
  }
}

module.exports = { UserInfoCommand };
