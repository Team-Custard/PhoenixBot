const { PermissionFlagsBits, EmbedBuilder, Colors } = require("discord.js");
const { PaginatedMessage } = require("@sapphire/discord.js-utilities");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");
const { Case } = require("../../tools/moderation");

const PAGE_SIZE = 9;

class InfractionsCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "infractions",
      aliases: ["inf", "cases", "warns"],
      description: "Displays a user's infractions.",
      examples: ["infractions sylveondev", "infractions sylveondev warn --long"],
      args: [
        { name: "user", type: "user", required: true, description: "The user to check" },
        { name: "punishment", type: "string", description: "Only show one type of punishment, e.g. warn or ban" },
        { name: "long", type: "boolean", aliases: ["l"], description: "Show the list in one column" },
      ],
      slash: { group: "mod" },
      cooldownDelay: 3_000,
      suggestedUserPermissions: [PermissionFlagsBits.ModerateMembers],
      preconditions: ["module"],
    });
  }

  async run(ctx, { user, punishment, long }) {
    await ctx.defer();

    const filter = { guildId: ctx.guild.id, member: user.id };
    if (punishment) filter.punishment = { $regex: `^${escapeRegex(punishment)}`, $options: "i" };

    // Newest first.
    const [cases, activeWarnings, total] = await Promise.all([
      Case.find(filter).sort({ caseId: -1 }).lean(),
      Case.countWarnings(ctx.guild.id, user.id),
      Case.countDocuments({ guildId: ctx.guild.id, member: user.id }),
    ]);

    if (cases.length === 0) {
      return ctx.reply(
        `${emoji("error")} No infractions on **${user.tag}**. ${punishment ? "They have never received an infraction for the type you're looking for." : "They're squeaky clean."}`,
      );
    }

    const fields = cases.map((inf) => ({
      name: `\` ${inf.caseId} \` **${inf.punishment}**`,
      value: [
        `* **Created:** ${inf.creationDate ? `<t:${inf.creationDate}:R>` : "Unknown"}`,
        `* **Moderator:** <@!${inf.moderator}>`,
        `* **Reason:** ${inf.reason || "No reason specified"}`,
        inf.expiretime ? `* **Expires:** <t:${inf.expiretime}:R>` : null,
      ].filter(Boolean).join("\n").slice(0, 1024),
      inline: !long,
    }));

    const title = punishment
      ? `${cases.length} found infractions`
      : `${activeWarnings} active warnings - ${total} total infractions`;

    const pages = [];
    for (let i = 0; i < fields.length; i += PAGE_SIZE) {
      pages.push(
        new EmbedBuilder()
          .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
          .setTitle(i === 0 ? title : null)
          .addFields(fields.slice(i, i + PAGE_SIZE))
          .setColor(Colors.Orange)
          .setTimestamp(new Date()),
      );
    }

    if (pages.length === 1) return ctx.reply({ embeds: pages });

    const paginated = new PaginatedMessage();
    for (const embed of pages) paginated.addPageEmbed(embed);
    return paginated.run(ctx.source, ctx.user);
  }
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { InfractionsCommand };
