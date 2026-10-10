const { PermissionFlagsBits } = require("discord.js");
const { BucketScope } = require("@sapphire/framework");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { getJson } = require("../../tools/http");

class DogCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "dog",
      description: "Sends a random dog picture.",
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
    const { message } = await getJson("https://dog.ceo/api/breeds/image/random");
    return ctx.reply({ files: [message] });
  }
}

module.exports = { DogCommand };
