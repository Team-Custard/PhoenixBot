const { PermissionFlagsBits } = require("discord.js");
const { BucketScope } = require("@sapphire/framework");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");
const { reverseSearchLinks } = require("../../tools/reverseSearch");

class RanCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "ran",
      aliases: ["reversebanner", "reversean"],
      description: "Searches for the source of a user's banner. We call it ran because it sounds cool.",
      examples: ["ran @sylveondev"],
      args: [{ name: "user", type: "user", required: true, description: "The user whose banner to search" }],
      slash: { group: "utilities" },
      guildOnly: false,
      cooldownDelay: 60_000,
      cooldownLimit: 3,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ["module"],
    });
  }

  async run(ctx, { user }) {
    const fetched = await this.container.client.users.fetch(user.id, { force: true }).catch(() => null);
    const banner = fetched?.bannerURL({ size: 2048 });
    if (!banner) return ctx.error(`${emoji("error")} This user currently does not have a banner set.`);
    return ctx.reply(`Search **${user.username}**'s banner.\n${reverseSearchLinks(banner)}`);
  }
}

module.exports = { RanCommand };
