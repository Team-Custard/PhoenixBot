const { PermissionFlagsBits } = require("discord.js");
const { BucketScope } = require("@sapphire/framework");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");

class BannerCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "banner",
      description: "Displays a user's profile banner.",
      examples: ["banner", "banner 763631377152999435"],
      args: [{ name: "user", type: "user", description: "Whose banner to show (defaults to you)" }],
      slash: { group: "utilities" },
      guildOnly: false,
      cooldownDelay: 60_000,
      cooldownLimit: 3,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
      preconditions: ["module"],
    });
  }

  async run(ctx, { user }) {
    // Banners are only included when the user is fetched directly.
    const fetched = await this.container.client.users.fetch((user ?? ctx.user).id, { force: true }).catch(() => null);
    const banner = fetched?.bannerURL({ size: 1024 });
    if (!banner) return ctx.error(`${emoji("error")} This user currently does not have a banner set.`);
    return ctx.reply({ files: [banner] });
  }
}

module.exports = { BannerCommand };
