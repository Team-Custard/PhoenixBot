const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { getSettings } = require("../../tools/guildSettings");
const { emoji } = require("../../tools/errorReporter");
const mod = require("../../tools/moderation");
const common = require("../../tools/commonArgs");
const { scheduleMemberTask } = require("../../tools/tasks");

class BanCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "ban",
      aliases: ["b", "yeet", "obliterate"],
      description: "Bans a user from the server, optionally for a set amount of time.",
      examples: ["ban sylveondev Being cool", "ban bill11 5h Being a raccoon --silent"],
      args: [
        { name: "user", type: "user", required: true, description: "The user to ban" },
        common.duration("How long the ban lasts, e.g. 1h or 7d. Leave empty for a permanent ban"),
        common.reason(),
        common.silent,
        common.hidden,
        { name: "purge", type: "boolean", aliases: ["p"], description: "Delete the last 7 days of their messages" },
        { name: "unappealable", type: "boolean", aliases: ["ua"], description: "Don't include the ban appeal link in the DM" },
      ],
      slash: { group: "mod" },
      ...common.modCooldown,
      suggestedUserPermissions: [PermissionFlagsBits.BanMembers],
      requiredClientPermissions: [PermissionFlagsBits.BanMembers],
      preconditions: ["module"],
    });
  }

  async run(ctx, { user, duration, reason, silent, hidden, purge, unappealable }) {
    await ctx.defer();
    const guild = ctx.guild;

    if (await guild.bans.fetch(user.id).catch(() => undefined)) {
      return ctx.reply(`${emoji("error")} That user is already banned.`);
    }

    // Users who aren't in the server can still be banned, but there's no hierarchy to
    // check and they shouldn't get a DM about a server they aren't in.
    const member = await guild.members.fetch(user.id).catch(() => undefined);
    if (member) {
      const problem = mod.checkHierarchy(ctx.member, member, "ban");
      if (problem) return ctx.reply(problem);
    }
    else {
      silent = true;
    }

    const settings = await getSettings(guild.id);
    const caseDoc = await mod.openCase(guild.id, {
      punishment: "Ban",
      member: user.id,
      moderator: ctx.user.id,
      reason,
      expiretime: mod.expiryFromNow(duration),
      hidden,
    });

    let notified = false;
    if (!silent) {
      const canAppeal = Boolean(settings.moderation?.appealLink) && !unappealable;
      const appealRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel(canAppeal ? "Appeal" : "This ban cannot be appealed")
          .setDisabled(!canAppeal)
          .setURL(settings.moderation?.appealLink || "https://discord.com"),
      );
      notified = await mod.notifyUser(user, guild, {
        title: `${emoji("error")} You were banned!`,
        intro: `You have been banned from **${guild.name}**.`,
        caseDoc,
        hideMod: hidden,
        duration: duration ?? null,
        components: [appealRow],
      });
    }

    try {
      await guild.bans.create(user.id, {
        deleteMessageSeconds: purge ? 60 * 60 * 24 * 7 : 0,
        reason: mod.auditReason("Ban", ctx.user, caseDoc.reason, duration),
      });
    }
    catch (err) {
      await caseDoc.deleteOne().catch(() => undefined);
      throw err;
    }

    if (duration) {
      await scheduleMemberTask("tempBan", { guildid: guild.id, memberid: user.id, caseid: caseDoc.caseId }, duration);
    }

    await mod.sendModlog(guild, settings, caseDoc, { moderator: `${ctx.user}`, duration: duration ?? null });

    return ctx.reply(
      `${emoji("success")} Banned **${user.tag}**${duration ? ` for ${await mod.formatDuration(duration)}` : ""}. ${!silent && notified ? "" : "User was not notified."}`,
    );
  }
}

module.exports = { BanCommand };
