const { PermissionFlagsBits } = require("discord.js");
const { BucketScope } = require("@sapphire/framework");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { getAttachment } = require("../../tools/http");

class CatCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "cat",
      description: "Sends a random cat picture from cataas.",
      slash: { group: "utilities" },
      guildOnly: false,
      cooldownDelay: 60_000,
      cooldownLimit: 10,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
      preconditions: ["module"],
    });
  }

  async run(ctx) {
    await ctx.defer();
    return ctx.reply({ files: [await getAttachment("https://cataas.com/cat", "cat")] });
  }
}

module.exports = { CatCommand };
