const { PermissionFlagsBits } = require("discord.js");
const { BucketScope } = require("@sapphire/framework");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");

// Same as `avatar --server`; on slash this is `/utilities avatar server:True`.
class GuildAvatarCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "guildavatar",
      aliases: ["gav"],
      description: "Displays a member's server avatar, or their normal avatar if they don't have one.",
      examples: ["guildavatar 763631377152999435"],
      args: [{ name: "member", type: "member", description: "Whose avatar to show (defaults to you)" }],
      slash: { group: "utilities", name: "serveravatar" },
      cooldownDelay: 60_000,
      cooldownLimit: 10,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
      preconditions: ["module"],
    });
  }

  async run(ctx, { member }) {
    if (!ctx.guild) return ctx.error(`${emoji("error")} I need to be in this server to do that.`);
    member = member ?? ctx.member;
    return ctx.reply({ files: [member.displayAvatarURL({ size: 1024 })] });
  }
}

module.exports = { GuildAvatarCommand };
