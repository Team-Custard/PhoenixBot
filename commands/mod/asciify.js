const { PermissionFlagsBits } = require("discord.js");
const { weirdToNormalChars } = require("weird-to-normal-chars");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");
const { checkHierarchy } = require("../../tools/moderation");

class AsciifyCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "asciify",
      aliases: ["asc", "ascii", "decancer", "nofancyletters"],
      description: "Removes special characters from a member's nickname.",
      examples: ["asciify sylveondev"],
      args: [{ name: "member", type: "member", required: true, description: "The member to clean up" }],
      slash: { group: "mod" },
      cooldownDelay: 1_800_000,
      cooldownLimit: 20,
      requiredClientPermissions: [PermissionFlagsBits.ManageNicknames],
      suggestedUserPermissions: [PermissionFlagsBits.ManageNicknames],
      preconditions: ["module"],
    });
  }

  async run(ctx, { member }) {
    const problem = checkHierarchy(ctx.member, member, "manage");
    if (problem) return ctx.reply(problem);

    const oldNickname = member.displayName;
    const nickname = weirdToNormalChars(oldNickname).slice(0, 32);
    await member.setNickname(nickname, `(Asciify by ${ctx.user.tag})`);
    return ctx.reply(
      `${emoji("success")} Asciified **${member.user.tag}**'s nickname from \`${oldNickname}\` to \`${nickname}\` successfully.`,
    );
  }
}

module.exports = { AsciifyCommand };
