const { PermissionFlagsBits } = require("discord.js");
const { BucketScope } = require("@sapphire/framework");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");

class AvatarCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "avatar",
      aliases: ["av"],
      description: "Displays a user's avatar.",
      examples: ["avatar", "avatar 763631377152999435", "avatar sylveondev --server"],
      args: [
        { name: "user", type: "user", description: "Whose avatar to show (defaults to you)" },
        { name: "server", type: "boolean", aliases: ["guild"], description: "Show their server avatar instead" },
      ],
      slash: { group: "utilities" },
      guildOnly: false,
      cooldownDelay: 60_000,
      cooldownLimit: 10,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
      preconditions: ["module"],
    });
  }

  async run(ctx, { user, server }) {
    user = user ?? ctx.user;
    if (server) {
      if (!ctx.guild) return ctx.error(`${emoji("error")} Sorry, no valid server found.`);
      const member = await ctx.guild.members.fetch(user.id).catch(() => null);
      if (member) return ctx.reply({ files: [member.displayAvatarURL({ size: 1024 })] });
    }
    return ctx.reply({ files: [user.displayAvatarURL({ size: 1024 })] });
  }
}

module.exports = { AvatarCommand };
