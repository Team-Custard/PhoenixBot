const { PermissionFlagsBits } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { getSettings } = require("../../tools/guildSettings");
const { emoji } = require("../../tools/errorReporter");

class VerifyCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "verify",
      aliases: ["manualverify"],
      description: "Manually verifies a member. Verification itself is set up on the dashboard.",
      examples: ["verify sylveondev Known member"],
      args: [
        { name: "member", type: "member", required: true, description: "The member to verify" },
        { name: "reason", type: "string", rest: true, maxLength: 400, description: "Why they're being verified" },
      ],
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.ManageRoles],
      preconditions: ["module"],
    });
  }

  async run(ctx, { member, reason }) {
    const settings = await getSettings(ctx.guild.id);
    const verification = settings.verification ?? {};
    if (!verification.role) return ctx.reply(`${emoji("error")} Verification is not set up. Set it up on the dashboard first.`);

    // Verification managers (set on the dashboard) or anyone with Manage Roles can verify.
    const isManager = verification.managerRole && ctx.member.roles.cache.has(verification.managerRole);
    if (!isManager && !ctx.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return ctx.reply(`${emoji("error")} You need the verification manager role or **Manage Roles** to verify members.`);
    }
    if (!member.manageable) return ctx.reply(`${emoji("error")} I'm not high enough in the role hierarchy to manage this member.`);
    if (member.roles.cache.has(verification.role)) return ctx.reply(`${emoji("error")} The user is already verified.`);

    const audit = `(Verified by ${ctx.user.tag}) ${reason || "No reason specified"}`;
    await member.roles.add(verification.role, audit);
    if (verification.unverifiedRole && member.roles.cache.has(verification.unverifiedRole)) {
      await member.roles.remove(verification.unverifiedRole, audit).catch(() => undefined);
    }
    return ctx.reply(`${emoji("success")} Verified **${member.user.tag}**.`);
  }
}

module.exports = { VerifyCommand };
