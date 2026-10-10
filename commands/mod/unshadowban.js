const { PermissionFlagsBits } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { getSettings } = require("../../tools/guildSettings");
const { emoji } = require("../../tools/errorReporter");
const mod = require("../../tools/moderation");
const common = require("../../tools/commonArgs");

class UnshadowbanCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "unshadowban",
      aliases: ["ushb", "unbanish"],
      description: "Restores a member's roles from before their shadowban.",
      examples: ["unshadowban sylveondev Appeal accepted"],
      args: [
        { name: "member", type: "member", required: true, description: "The member to unshadowban" },
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
    if (!settings.moderation?.shadowBannedRole) {
      return ctx.reply(`${emoji("error")} Shadowbanning is not set up. Pick a shadowban role on the dashboard first.`);
    }
    await ctx.defer();

    const saved = settings.moderation.shadowbannedUsers.find((m) => m.user === member.id);
    if (saved) {
      await member.roles.set(saved.roles, mod.auditReason("Unshadowban", ctx.user, reason)).catch(() => undefined);
      settings.moderation.shadowbannedUsers.pull(saved);
      await settings.save();
    }
    else if (member.roles.cache.has(settings.moderation.shadowBannedRole)) {
      await member.roles.remove(settings.moderation.shadowBannedRole, mod.auditReason("Unshadowban", ctx.user, reason)).catch(() => undefined);
    }

    const caseDoc = await mod.openCase(ctx.guild.id, {
      punishment: "Unshadowban",
      member: member.id,
      moderator: ctx.user.id,
      reason,
      hidden,
    });

    const notified = silent
      ? false
      : await mod.notifyUser(member, ctx.guild, {
        title: `${emoji("success")} You were unshadowbanned!`,
        intro: `You have been unshadowbanned in **${ctx.guild.name}**.`,
        caseDoc,
        hideMod: hidden,
      });

    await mod.sendModlog(ctx.guild, settings, caseDoc, { moderator: `${ctx.user}` });
    return ctx.reply(`${emoji("success")} Unshadowbanned **${member.user.tag}**. ${!silent && notified ? "" : "User was not notified."}`);
  }
}

module.exports = { UnshadowbanCommand };
