const { PermissionFlagsBits } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");
const { checkHierarchy } = require("../../tools/moderation");

class DehoistCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "dehoist",
      aliases: ["dh"],
      description: "Moves a member using characters to hoist themselves to the bottom of the member list.",
      examples: ["dehoist sylveondev"],
      args: [{ name: "member", type: "member", required: true, description: "The member to dehoist" }],
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

    // An invisible character sorts after everything else in the member list.
    const nickname = ` ឵${member.displayName}`.slice(0, 32);
    await member.setNickname(nickname, `(Dehoist by ${ctx.user.tag})`);
    return ctx.reply(`${emoji("success")} Dehoisted **${member.user.tag}**.`);
  }
}

module.exports = { DehoistCommand };
