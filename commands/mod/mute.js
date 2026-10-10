const { PermissionFlagsBits } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { getSettings } = require("../../tools/guildSettings");
const { emoji } = require("../../tools/errorReporter");
const mod = require("../../tools/moderation");
const common = require("../../tools/commonArgs");

class MuteCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "mute",
      aliases: ["m", "timeout", "silence"],
      description: "Mutes a member. Up to 28 days uses a timeout; longer or no duration uses the mute role.",
      examples: ["mute sylveondev 2h Being cool"],
      args: [
        { name: "member", type: "member", required: true, description: "The member to mute" },
        common.duration("How long to mute for (max 28 days for timeouts). Leave empty to use the mute role"),
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

  async run(ctx, { member, duration, reason, silent, hidden }) {
    const problem = mod.checkHierarchy(ctx.member, member, "moderate");
    if (problem) return ctx.reply(problem);
    await ctx.defer();

    const settings = await getSettings(ctx.guild.id);
    const useTimeout = duration && duration <= mod.MAX_TIMEOUT;
    const auditReason = mod.auditReason("Mute", ctx.user, reason, useTimeout ? duration : null);

    if (useTimeout) {
      await member.disableCommunicationUntil(Date.now() + duration, auditReason);
    }
    else {
      const muteRole = settings.moderation?.muteRole;
      if (!muteRole) {
        return ctx.reply(
          `${emoji("error")} To mute members permanently, a mute role needs to be set. You can set one on the dashboard.`,
        );
      }
      await member.roles.add(muteRole, auditReason);
    }

    const caseDoc = await mod.openCase(ctx.guild.id, {
      punishment: "Mute",
      member: member.id,
      moderator: ctx.user.id,
      reason,
      expiretime: mod.expiryFromNow(duration),
      hidden,
    });

    const notified = silent
      ? false
      : await mod.notifyUser(member, ctx.guild, {
        title: `${emoji("warning")} You were muted!`,
        intro: `You have been muted in **${ctx.guild.name}**.`,
        caseDoc,
        hideMod: hidden,
        duration: duration ?? null,
      });

    await mod.sendModlog(ctx.guild, settings, caseDoc, { moderator: `${ctx.user}`, duration: duration ?? null });
    return ctx.reply(
      `${emoji("success")} Muted **${member.user.tag}**${useTimeout ? ` for ${await mod.formatDuration(duration)}` : ""}. ${!silent && notified ? "" : "User was not notified."}`,
    );
  }
}

module.exports = { MuteCommand };
