const { PermissionFlagsBits } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { reverseSearchLinks } = require("../../tools/reverseSearch");

class RavCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "rav",
      aliases: ["reverseavatar", "reverseav"],
      description: "Searches for the source of a user's avatar. We call it rav because it sounds cool.",
      examples: ["rav @sylveondev"],
      args: [{ name: "user", type: "user", required: true, description: "The user whose avatar to search" }],
      slash: { group: "utilities" },
      guildOnly: false,
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ["module"],
    });
  }

  run(ctx, { user }) {
    return ctx.reply(`Search **${user.username}**'s avatar.\n${reverseSearchLinks(user.displayAvatarURL({ size: 2048 }))}`);
  }
}

module.exports = { RavCommand };
