const { PermissionFlagsBits } = require("discord.js");
const { BucketScope } = require("@sapphire/framework");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");

class IconCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "icon",
      aliases: ["servericon"],
      description: "Displays the server icon.",
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
    const icon = ctx.guild.iconURL({ size: 1024 });
    if (!icon) return ctx.error(`${emoji("error")} This server doesn't have an icon.`);
    return ctx.reply({ files: [icon] });
  }
}

module.exports = { IconCommand };
