const { PermissionFlagsBits } = require("discord.js");
const { toOrdinal } = require("ordinal-js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { getSettings } = require("../../tools/guildSettings");
const { emoji } = require("../../tools/errorReporter");
const mod = require("../../tools/moderation");
const common = require("../../tools/commonArgs");
const { systemStep, stepEmbed, applySystemStep } = require("../../tools/punish");

class WarnCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "warn",
      aliases: ["w", "strike"],
      description: "Gives a member a warning. Warnings can trigger the server's punishment system, and can expire.",
      examples: ["warn sylveondev Being cool", "warn bill11 7d Being a raccoon --silent"],
      args: [
        { name: "member", type: "member", required: true, description: "The member to warn" },
        common.duration("How long the warning counts, e.g. 7d or 30d. Leave empty for the server's default"),
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

  async run(ctx, { member, duration, reason, silent, hidden }) {
    const problem = mod.checkHierarchy(ctx.member, member, "manage");
    if (problem) return ctx.reply(problem);
    await ctx.defer();

    const guild = ctx.guild;
    const settings = await getSettings(guild.id);
    // Temporary warnings stop counting once they expire.
    const lasts = mod.warningDuration(settings, duration);
    const warnCase = await mod.openCase(guild.id, {
      punishment: "Warn",
      member: member.id,
      moderator: ctx.user.id,
      reason,
      hidden,
      expiretime: mod.expiryFromNow(lasts),
    });
    const expires = lasts ? await mod.formatDuration(lasts) : null;
    const warnings = await mod.Case.countWarnings(guild.id, member.id);

    // The punishment system: e.g. "on 3 warnings, mute for 1h".
    const step = systemStep(settings, warnings);

    let notified = false;
    if (!silent) {
      // DM before an automatic kick/ban so the member can still receive it.
      notified = await mod.notifyUser(member, guild, {
        title: `${emoji("warning")} Warning received!`,
        intro: `You were issued a warning in **${guild.name}**. You now have ${warnings} warnings.${expires ? ` This one expires in ${expires}.` : ""}`,
        caseDoc: warnCase,
        hideMod: hidden,
        extraEmbeds: step ? [await stepEmbed(step)] : [],
      });
    }

    await mod.sendModlog(guild, settings, warnCase, { moderator: hidden ? "Hidden" : `${ctx.user}` });

    let stepResult = "";
    if (step) {
      const { ok } = await applySystemStep(member, settings, step);
      stepResult = ok
        ? `User received a ${step.punishment.toLowerCase()} for this warning.`
        : `${emoji("warning")} Unable to execute the punishment system.`;
    }

    return mod.replySuccess(ctx, settings, {
      action: "Warned",
      member,
      caseDoc: warnCase,
      duration: lasts,
      warnings,
      text: `Warned **${member.user.tag}**, ${toOrdinal(warnings)} warning${expires ? ` (expires in ${expires})` : ""}.`,
      notes: [!silent && notified ? "" : "User was not notified.", stepResult],
    });
  }
}

module.exports = { WarnCommand };
