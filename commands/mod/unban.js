const { PermissionFlagsBits } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { getSettings } = require("../../tools/guildSettings");
const { emoji } = require("../../tools/errorReporter");
const mod = require("../../tools/moderation");
const common = require("../../tools/commonArgs");
const { cancelMemberTask } = require("../../tools/tasks");

class UnbanCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "unban",
      aliases: ["ub"],
      description: "Unbans a user.",
      examples: ["unban sylveondev Appeal accepted"],
      args: [
        { name: "user", type: "user", required: true, description: "The user to unban" },
        common.reason(),
      ],
      slash: { group: "mod" },
      ...common.modCooldown,
      suggestedUserPermissions: [PermissionFlagsBits.BanMembers],
      requiredClientPermissions: [PermissionFlagsBits.BanMembers],
      preconditions: ["module"],
    });
  }

  async run(ctx, { user, reason }) {
    if (user.id === ctx.user.id) return ctx.reply(`${emoji("error")} You can't use this on yourself.`);
    await ctx.defer();

    try {
      await ctx.guild.bans.remove(user.id, mod.auditReason("Unban", ctx.user, reason));
    }
    catch (err) {
      // 10026 = Unknown Ban
      if (err?.code === 10026) return ctx.reply(`${emoji("error")} That user isn't banned.`);
      return ctx.reply(`${emoji("error")} ${err.message}`);
    }

    // Cancel a pending temp-ban expiry for this user, if there is one.
    await cancelMemberTask("tempBan", ctx.guild.id, user.id, { scanLegacy: true });

    const settings = await getSettings(ctx.guild.id);
    const caseDoc = await mod.openCase(ctx.guild.id, {
      punishment: "Unban",
      member: user.id,
      moderator: ctx.user.id,
      reason,
    });
    await mod.sendModlog(ctx.guild, settings, caseDoc, { moderator: `${ctx.user}` });
    return ctx.reply(`${emoji("success")} Unbanned **${user.tag}**.`);
  }
}

module.exports = { UnbanCommand };
