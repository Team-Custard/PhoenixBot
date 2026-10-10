const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");
const { dashboard } = require("../../tools/config");

// The old configuration commands now live on the web dashboard. Their names are kept
// as aliases so `=welcomer`, `=logging` etc. point people to the right page.
const SECTION_FOR_ALIAS = {
  prefix: "general",
  toggle: "general",
  enable: "general",
  override: "general",
  grant: "general",
  permission: "general",
  muterole: "moderation",
  mutedrole: "moderation",
  shadowbanrole: "moderation",
  sbanrole: "moderation",
  "appeals-link": "moderation",
  appeal: "moderation",
  appeallink: "moderation",
  "punishment-system": "moderation",
  system: "moderation",
  warnsystem: "moderation",
  logging: "logging",
  log: "logging",
  logignore: "logging",
  msglogignore: "logging",
  autokick: "automod",
  minimumage: "automod",
  welcomer: "welcome",
  goodbye: "welcome",
  verification: "verification",
  starboard: "starboard",
  rolemenu: "rolemenus",
  rolesmenu: "rolemenus",
  pickroles: "rolemenus",
};

class DashboardCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "dashboard",
      aliases: ["settings", "config", ...Object.keys(SECTION_FOR_ALIAS)],
      description: "Opens the web dashboard, where all of this server's settings are managed.",
      args: [{
        name: "section",
        type: "string",
        description: "Jump to a settings page",
        choices: [
          { name: "General", value: "general" },
          { name: "Moderation", value: "moderation" },
          { name: "Logging", value: "logging" },
          { name: "Automod", value: "automod" },
          { name: "Welcome & goodbye", value: "welcome" },
          { name: "Verification", value: "verification" },
          { name: "Starboard", value: "starboard" },
          { name: "Leveling", value: "leveling" },
          { name: "Role menus", value: "rolemenus" },
          { name: "Tags", value: "tags" },
          { name: "Cases", value: "cases" },
        ],
      }],
      cooldownDelay: 3_000,
      suggestedUserPermissions: [PermissionFlagsBits.ManageGuild],
    });
  }

  run(ctx, { section }) {
    if (!dashboard.baseUrl) return ctx.reply(`${emoji("error")} The dashboard isn't configured for this bot.`);
    const page = section ?? SECTION_FOR_ALIAS[ctx.invokedName?.toLowerCase()] ?? "";
    const url = `${dashboard.baseUrl}/dash/${ctx.guild.id}${page ? `/${page}` : ""}`;
    const moved = SECTION_FOR_ALIAS[ctx.invokedName?.toLowerCase()];
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Open dashboard").setURL(url),
    );
    return ctx.reply({
      content: moved
        ? `${emoji("info")} \`${ctx.invokedName}\` has moved to the web dashboard. You can change this setting there.`
        : `${emoji("info")} Manage **${ctx.guild.name}**'s settings on the web dashboard.`,
      components: [row],
    });
  }
}

module.exports = { DashboardCommand };
