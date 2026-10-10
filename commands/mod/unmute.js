const { PermissionFlagsBits } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { getSettings } = require("../../tools/guildSettings");
const { emoji } = require("../../tools/errorReporter");
const mod = require("../../tools/moderation");
const common = require("../../tools/commonArgs");
const { cancelMemberTask } = require("../../tools/tasks");

class UnmuteCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "unmute",
      aliases: ["um"],
      description: "Unmutes a member.",
      examples: ["unmute sylveondev Love ya"],
      args: [
        { name: "member", type: "member", required: true, description: "The member to unmute" },
        common.reason(),
        common.silent,
        common.hidden,
      ],
      slash: { group: "mod" },
      ...common.modCooldown,
      suggestedUserPermissions: [PermissionFlagsBits.ModerateMembers],
      requiredClientPermissions: [PermissionFlagsBits.ModerateMembers],
      preconditions: ["module"],
    });
  }

  async run(ctx, { member, reason, silent, hidden }) {
    const problem = mod.checkHierarchy(ctx.member, member, "moderate");
    if (problem) return ctx.reply(problem);
    await ctx.defer();

    const settings = await getSettings(ctx.guild.id);
    const auditReason = mod.auditReason("Unmute", ctx.user, reason);
    const muteRole = settings.moderation?.muteRole;

    if (member.isCommunicationDisabled()) {
      await member.disableCommunicationUntil(null, auditReason);
    }
    else if (muteRole && member.roles.cache.has(muteRole)) {
      await member.roles.remove(muteRole, auditReason);
      await cancelMemberTask("tempMute", ctx.guild.id, member.id);
    }
    else {
      return ctx.reply(`${emoji("error")} That user isn't muted.`);
    }

    const caseDoc = await mod.openCase(ctx.guild.id, {
      punishment: "Unmute",
      member: member.id,
      moderator: ctx.user.id,
      reason,
      hidden,
    });

    const notified = silent
      ? false
      : await mod.notifyUser(member, ctx.guild, {
        title: `${emoji("success")} You were unmuted!`,
        intro: `You have been unmuted in **${ctx.guild.name}**.`,
        caseDoc,
        hideMod: hidden,
      });

    await mod.sendModlog(ctx.guild, settings, caseDoc, { moderator: `${ctx.user}` });
    return ctx.reply(`${emoji("success")} Unmuted **${member.user.tag}**. ${!silent && notified ? "" : "User was not notified."}`);
  }
}

module.exports = { UnmuteCommand };
