const { PermissionFlagsBits } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { getSettings } = require("../../tools/guildSettings");
const { emoji } = require("../../tools/errorReporter");
const mod = require("../../tools/moderation");

class ReasonCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "reason",
      aliases: ["re", "setreason"],
      description: "Changes the reason of a case.",
      examples: ["reason 12 Spamming in general"],
      args: [
        { name: "case_id", type: "integer", required: true, minValue: 1, description: "The case number to change" },
        { name: "reason", type: "string", required: true, rest: true, maxLength: 1000, description: "The new reason" },
      ],
      slash: { group: "mod" },
      cooldownDelay: 3_000,
      suggestedUserPermissions: [PermissionFlagsBits.ModerateMembers],
      preconditions: ["module"],
    });
  }

  async run(ctx, { case_id, reason }) {
    const caseDoc = await mod.Case.findCase(ctx.guild.id, case_id);
    if (!caseDoc) return ctx.reply(`${emoji("error")} No such case found.`);

    caseDoc.moderator = ctx.user.id;
    caseDoc.reason = reason;
    await caseDoc.save();
    await ctx.reply(`${emoji("success")} Modified reason for case **\` ${case_id} \`**.`);

    const settings = await getSettings(ctx.guild.id);
    await mod.updateModlog(ctx.guild, settings, caseDoc, { moderator: `${ctx.user}` });
  }
}

module.exports = { ReasonCommand };
