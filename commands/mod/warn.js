const { PermissionFlagsBits, EmbedBuilder, Colors } = require("discord.js");
const { toOrdinal } = require("ordinal-js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { getSettings } = require("../../tools/guildSettings");
const { emoji } = require("../../tools/errorReporter");
const mod = require("../../tools/moderation");
const common = require("../../tools/commonArgs");
const { scheduleMemberTask } = require("../../tools/tasks");

class WarnCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "warn",
      aliases: ["w", "strike"],
      description: "Gives a member a warning. Warnings can trigger the server's punishment system.",
      examples: ["warn sylveondev Being cool", "warn bill11 Being a raccoon --silent"],
      args: [
        { name: "member", type: "member", required: true, description: "The member to warn" },
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
    await ctx.defer();

    const guild = ctx.guild;
    const settings = await getSettings(guild.id);
    const warnCase = await mod.openCase(guild.id, {
      punishment: "Warn",
      member: member.id,
      moderator: ctx.user.id,
      reason,
      hidden,
    });
    const warnings = await mod.Case.countWarnings(guild.id, member.id);

    // The punishment system: e.g. "on 3 warnings, mute for 1h".
    const step = settings.moderation?.system?.find((s) => Number(s.warnings) === warnings);
    const stepDuration = step?.duration > 0 ? step.duration : null;

    let notified = false;
    if (!silent) {
      const extraEmbeds = [];
      if (step) {
        extraEmbeds.push(
          new EmbedBuilder()
            .setTitle("Punishment system")
            .setDescription(
              `You have reached **${step.warnings}** warnings. You have received a ${step.punishment.toLowerCase()}${stepDuration ? ` for ${await mod.formatDuration(stepDuration)}` : ""}.`,
            )
            .setColor(Colors.Orange),
        );
      }
      // DM before an automatic kick/ban so the member can still receive it.
      notified = await mod.notifyUser(member, guild, {
        title: `${emoji("warning")} Warning received!`,
        intro: `You were issued a warning in **${guild.name}**. You now have ${warnings} warnings.`,
        caseDoc: warnCase,
        hideMod: hidden,
        extraEmbeds,
      });
    }

    await mod.sendModlog(guild, settings, warnCase, { moderator: hidden ? "Hidden" : `${ctx.user}` });

    let stepResult = "";
    if (step) {
      const ok = await this.applyPunishmentStep(ctx, settings, member, step, stepDuration, reason);
      stepResult = ok
        ? `\nUser received a ${step.punishment.toLowerCase()} for this warning.`
        : `\n${emoji("warning")} Unable to execute the punishment system.`;
    }

    return ctx.reply(
      `${emoji("success")} Warned **${member.user.tag}**, ${toOrdinal(warnings)} warning. ${!silent && notified ? "" : "User was not notified."}${stepResult}`,
    );
  }

  /** Carries out a punishment system step. Returns false if it failed. */
  async applyPunishmentStep(ctx, settings, member, step, duration, reason) {
    const guild = ctx.guild;
    const punishment = step.punishment.toLowerCase();
    const audit = `(Warn by ${ctx.user.tag}) [${step.warnings} warnings] ${reason || "No reason specified"}`.slice(0, 512);

    try {
      switch (punishment) {
        case "mute":
          if (duration && duration <= mod.MAX_TIMEOUT) await member.disableCommunicationUntil(Date.now() + duration, audit);
          else if (settings.moderation?.muteRole) await member.roles.add(settings.moderation.muteRole, audit);
          else return false;
          break;
        case "kick":
          await member.kick(audit);
          break;
        case "shadowban": {
          const role = settings.moderation?.shadowBannedRole;
          if (!role) return false;
          settings.moderation.shadowbannedUsers.push({
            user: member.id,
            roles: member.roles.cache.filter((r) => r.id !== guild.id).map((r) => r.id),
          });
          await member.roles.set([role], audit);
          await settings.save();
          break;
        }
        case "ban":
          await member.ban({ reason: audit });
          break;
        default:
          return false;
      }
    }
    catch (err) {
      console.log(`[warn] Punishment system step failed`, err);
      return false;
    }

    const stepCase = await mod.openCase(guild.id, {
      punishment: step.punishment,
      member: member.id,
      moderator: this.container.client.user.id,
      reason: `(Automod) Reached ${step.warnings} active warnings.`,
      expiretime: mod.expiryFromNow(duration),
    });

    if (punishment === "ban" && duration) {
      await scheduleMemberTask("tempBan", { guildid: guild.id, memberid: member.id, caseid: stepCase.caseId }, duration);
    }

    await mod.sendModlog(guild, settings, stepCase, {
      moderator: `${this.container.client.user}`,
      duration: duration ?? null,
    });
    return true;
  }
}

module.exports = { WarnCommand };
