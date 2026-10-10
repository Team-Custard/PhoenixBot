const { PermissionFlagsBits } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { getSettings } = require("../../tools/guildSettings");
const { emoji } = require("../../tools/errorReporter");
const mod = require("../../tools/moderation");

class PardonCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "pardon",
      aliases: ["pd", "removewarn", "excuse"],
      description: "Pardons a warning so it no longer counts towards the punishment system.",
      examples: ["pardon 12"],
      args: [{ name: "case_id", type: "integer", required: true, minValue: 1, description: "The case number to pardon" }],
      slash: { group: "mod" },
      cooldownDelay: 3_000,
      suggestedUserPermissions: [PermissionFlagsBits.ManageGuild],
      preconditions: ["module"],
    });
  }

  async run(ctx, { case_id }) {
    const caseDoc = await mod.Case.findCase(ctx.guild.id, case_id);
    if (!caseDoc) return ctx.reply(`${emoji("error")} No such case found.`);
    if (caseDoc.punishment !== "Warn") {
      return ctx.reply(`${emoji("error")} Sorry, this case is not a warning or was already pardoned.`);
    }

    caseDoc.punishment = "Warn (pardoned)";
    caseDoc.expired = true;
    await caseDoc.save();

    await ctx.reply(
      `${emoji("success")} **${await mod.displayUser(this.container.client, caseDoc.member)}**'s warning has been pardoned.`,
    );
    const settings = await getSettings(ctx.guild.id);
    await mod.updateModlog(ctx.guild, settings, caseDoc);
  }
}

module.exports = { PardonCommand };
