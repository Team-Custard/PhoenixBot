const { PermissionFlagsBits } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");
const { checkHierarchy } = require("../../tools/moderation");

class NickCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "nick",
      aliases: ["setnick", "nickname"],
      description: "Changes or resets a member's nickname.",
      examples: ["nick sylveondev Abby", "nick sylveondev"],
      args: [
        { name: "member", type: "member", required: true, description: "The member to manage" },
        { name: "nickname", type: "string", rest: true, maxLength: 32, description: "The new nickname. Leave empty to reset it" },
      ],
      slash: { group: "mod" },
      cooldownDelay: 1_800_000,
      cooldownLimit: 20,
      requiredClientPermissions: [PermissionFlagsBits.ManageNicknames],
      suggestedUserPermissions: [PermissionFlagsBits.ManageNicknames],
      preconditions: ["module"],
    });
  }

  async run(ctx, { member, nickname }) {
    if (member.id === ctx.user.id) return ctx.reply(`${emoji("error")} You can't change your own nickname with the bot.`);
    const problem = checkHierarchy(ctx.member, member, "manage");
    if (problem) return ctx.reply(problem);

    await member.setNickname(nickname || null, `(Nick by ${ctx.user.tag})`);
    return ctx.reply(
      `${emoji("success")} ${nickname ? `**${member.user.tag}**'s nickname has been changed to \`${nickname}\`.` : `**${member.user.tag}**'s nickname has been reset.`}`,
    );
  }
}

module.exports = { NickCommand };
