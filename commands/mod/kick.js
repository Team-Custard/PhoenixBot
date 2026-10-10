const { PermissionFlagsBits } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { getSettings } = require("../../tools/guildSettings");
const { emoji } = require("../../tools/errorReporter");
const mod = require("../../tools/moderation");
const common = require("../../tools/commonArgs");

class KickCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "kick",
      aliases: ["k", "boot"],
      description: "Kicks a member from the server.",
      examples: ["kick sylveondev Being cool", "kick bill11 Being a raccoon --silent"],
      args: [
        { name: "member", type: "member", required: true, description: "The member to kick" },
        common.reason(),
        common.silent,
        common.hidden,
      ],
      slash: { group: "mod" },
      ...common.modCooldown,
      suggestedUserPermissions: [PermissionFlagsBits.KickMembers],
      requiredClientPermissions: [PermissionFlagsBits.KickMembers],
      preconditions: ["module"],
    });
  }

  async run(ctx, { member, reason, silent, hidden }) {
    const problem = mod.checkHierarchy(ctx.member, member, "kick");
    if (problem) return ctx.reply(problem);
    await ctx.defer();

    const settings = await getSettings(ctx.guild.id);
    const caseDoc = await mod.openCase(ctx.guild.id, {
      punishment: "Kick",
      member: member.id,
      moderator: ctx.user.id,
      reason,
      hidden,
    });

    // DM first: once they're kicked we may no longer share a server with them.
    const notified = silent
      ? false
      : await mod.notifyUser(member, ctx.guild, {
        title: `${emoji("warning")} You've been kicked!`,
        intro: `You have been kicked from **${ctx.guild.name}**.`,
        caseDoc,
        hideMod: hidden,
      });

    try {
      await member.kick(mod.auditReason("Kick", ctx.user, caseDoc.reason));
    }
    catch (err) {
      await caseDoc.deleteOne().catch(() => undefined);
      throw err;
    }

    await mod.sendModlog(ctx.guild, settings, caseDoc, { moderator: `${ctx.user}` });
    return ctx.reply(`${emoji("success")} Kicked **${member.user.tag}**. ${!silent && notified ? "" : "User was not notified."}`);
  }
}

module.exports = { KickCommand };
