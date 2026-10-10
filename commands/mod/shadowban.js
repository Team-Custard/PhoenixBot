const { PermissionFlagsBits } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { getSettings } = require("../../tools/guildSettings");
const { emoji } = require("../../tools/errorReporter");
const mod = require("../../tools/moderation");
const common = require("../../tools/commonArgs");

class ShadowbanCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "shadowban",
      aliases: ["shb", "banish"],
      description: "Shadowbans a member: removes their roles and gives them the shadowban role.",
      examples: ["shadowban sylveondev Being sus"],
      args: [
        { name: "member", type: "member", required: true, description: "The member to shadowban" },
        common.reason(),
        common.silent,
        common.hidden,
      ],
      slash: { group: "mod" },
      ...common.modCooldown,
      suggestedUserPermissions: [PermissionFlagsBits.ModerateMembers],
      preconditions: ["module"],
    });
  }

  async run(ctx, { member, reason, silent, hidden }) {
    const problem = mod.checkHierarchy(ctx.member, member, "manage");
    if (problem) return ctx.reply(problem);

    const settings = await getSettings(ctx.guild.id);
    const shadowRole = settings.moderation?.shadowBannedRole;
    if (!shadowRole) {
      return ctx.reply(`${emoji("error")} Shadowbanning is not set up. Pick a shadowban role on the dashboard first.`);
    }
    await ctx.defer();

    const previousRoles = member.roles.cache.filter((r) => r.id !== ctx.guild.id);
    // Roles the bot can't remove (managed or above it) have to stay.
    const keptRoles = previousRoles.filter((r) => !r.editable || r.managed).map((r) => r.id);

    settings.moderation.shadowbannedUsers.push({ user: member.id, roles: previousRoles.map((r) => r.id) });
    await member.roles.set([shadowRole, ...keptRoles], mod.auditReason("Shadowban", ctx.user, reason));
    await settings.save();

    const caseDoc = await mod.openCase(ctx.guild.id, {
      punishment: "Shadowban",
      member: member.id,
      moderator: ctx.user.id,
      reason,
      hidden,
    });

    const notified = silent
      ? false
      : await mod.notifyUser(member, ctx.guild, {
        title: `${emoji("warning")} You were shadowbanned!`,
        intro: `You have been shadowbanned in **${ctx.guild.name}**.`,
        caseDoc,
        hideMod: hidden,
      });

    await mod.sendModlog(ctx.guild, settings, caseDoc, {
      moderator: `${ctx.user}`,
      extra: [`**Previous roles:** ${previousRoles.map((r) => `${r}`).join(" ").slice(0, 3000) || "None"}`],
    });
    return ctx.reply(`${emoji("success")} Shadowbanned **${member.user.tag}**. ${!silent && notified ? "" : "User was not notified."}`);
  }
}

module.exports = { ShadowbanCommand };
