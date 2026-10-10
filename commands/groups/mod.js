const { PermissionFlagsBits, InteractionContextType } = require("discord.js");
const { createSlashGroup } = require("../../tools/SlashGroup");

// /mod <command>: every command with `slash: { group: "mod" }` shows up here.
const ModGroup = createSlashGroup({
  name: "mod",
  description: "Moderation commands",
  defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  contexts: [InteractionContextType.Guild],
});

module.exports = { ModGroup };
