const { PermissionFlagsBits } = require("discord.js");
const { BucketScope } = require("@sapphire/framework");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");

class WolframCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "wolfram",
      description: "Gets an answer from Wolfram|Alpha.",
      examples: ["wolfram distance to the moon"],
      args: [{ name: "query", type: "string", required: true, rest: true, maxLength: 500, description: "What to ask" }],
      slash: { group: "utilities" },
      guildOnly: false,
      cooldownDelay: 60_000,
      cooldownLimit: 10,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ["module"],
    });
  }

  async run(ctx, { query }) {
    await ctx.defer();
    const response = await fetch(
      `https://api.wolframalpha.com/v1/result?i=${encodeURIComponent(query)}&appid=${process.env["wolframkey"]}`,
      { signal: AbortSignal.timeout(15_000) },
    ).catch(() => null);
    const result = response?.ok ? await response.text() : null;
    if (!result) return ctx.reply(`${emoji("error")} Not found or error occured.`);
    return ctx.reply({ content: `${emoji("info")} ${result}`.slice(0, 2000), allowedMentions: { parse: [] } });
  }
}

module.exports = { WolframCommand };
