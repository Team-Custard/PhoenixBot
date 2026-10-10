const { ApplicationIntegrationType, InteractionContextType } = require("discord.js");
const { createSlashGroup } = require("../../tools/SlashGroup");

// /utilities <command>: fun and media commands with `slash: { group: "utilities" }`.
// Also available as a user-installed app in DMs and other servers.
const UtilitiesGroup = createSlashGroup({
  name: "utilities",
  description: "Utility commands",
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
});

module.exports = { UtilitiesGroup };
