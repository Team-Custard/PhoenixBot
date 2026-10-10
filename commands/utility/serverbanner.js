const { PermissionFlagsBits } = require("discord.js");
const { BucketScope } = require("@sapphire/framework");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");

class ServerBannerCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "serverbanner",
      aliases: ["sbanner", "guildbanner"],
      description: "Displays the server banner.",
      slash: { group: "utilities" },
      cooldownDelay: 60_000,
      cooldownLimit: 10,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
      preconditions: ["module"],
    });
  }

  async run(ctx) {
    if (!ctx.guild) return ctx.error(`${emoji("error")} I need to be in this server to do that.`);
    if (!ctx.guild.banner) return ctx.error(`${emoji("error")} This server currently does not have a banner set.`);
    return ctx.reply({ files: [ctx.guild.bannerURL({ size: 1024 })] });
  }
}

module.exports = { ServerBannerCommand };
