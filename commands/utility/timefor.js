const {
  PermissionFlagsBits,
  ApplicationCommandType,
  ApplicationIntegrationType,
  InteractionContextType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const moment = require("moment-timezone");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");
const UserDB = require("../../tools/UserDB");

class TimeforCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "timefor",
      aliases: ["tf", "time"],
      description: "Displays a user's local time (from their UserDB timezone).",
      examples: ["timefor @sylveondev"],
      args: [{ name: "user", type: "user", description: "Whose time to show (defaults to you)" }],
      contextMenus: [{
        name: "Time for user",
        type: ApplicationCommandType.User,
        run: "timeForUserMenu",
        integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
        contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
      }],
      slash: { group: "userdb" },
      guildOnly: false,
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ["module"],
    });
  }

  async describe(user) {
    const prefs = await UserDB.findById(user.id).lean().cacheQuery();
    if (!prefs?.timezone) return { ok: false, text: `${emoji("error")} **${user.username}** does not have a timezone set.` };
    const now = moment().tz(prefs.timezone);
    return { ok: true, text: `**${user.username}**'s time is **${now.format("hh:mm:ss A")}** (${now.format("MM-DD-YYYY")}).` };
  }

  async run(ctx, { user }) {
    const result = await this.describe(user ?? ctx.user);
    return result.ok ? ctx.reply(result.text) : ctx.error(result.text);
  }

  /** @param {import("discord.js").UserContextMenuCommandInteraction} interaction */
  async timeForUserMenu(interaction) {
    const prefs = await UserDB.findById(interaction.user.id).lean().catch(() => null);
    await interaction.deferReply(prefs?.ephemeral ? { flags: MessageFlags.Ephemeral } : {});
    const result = await this.describe(interaction.targetUser);
    const toggle = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`userbotephemeral-${interaction.user.id}`)
        .setLabel("Toggle ephemeral")
        .setStyle(ButtonStyle.Secondary),
    );
    return interaction.editReply({ content: result.text, components: result.ok ? [toggle] : [] });
  }
}

module.exports = { TimeforCommand };
