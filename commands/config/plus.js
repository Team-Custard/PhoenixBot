const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Colors } = require("discord.js");
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");
const { commandMention } = require("../../tools/CommandContext");
const config = require("../../config.json");

class PlusCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "plus",
      description: "Information about the Phoenix Plus subscription.",
      examples: ["plus info", "plus status"],
      subcommands: [
        { name: "status", description: "Shows whether this server has Phoenix Plus", run: "status", default: true },
        { name: "info", description: "What Phoenix Plus is and how to get it", run: "info" },
        // Developers only: toggles a test entitlement for this server.
        { name: "test", description: "Toggle test premium (developers only)", run: "test", slash: false },
      ],
      cooldownDelay: 5_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
    });
  }

  async fetchEntitlement(guildId) {
    const entitlements = await this.container.client.application.entitlements.fetch({
      skus: [config.premiumId],
      guild: guildId,
      excludeEnded: true,
    });
    return entitlements.find((e) => e.guildId === guildId) ?? null;
  }

  info(ctx) {
    const embed = new EmbedBuilder()
      .setTitle("<:plus:1262930849083559947> Phoenix Plus")
      .setDescription("Phoenix Plus is a subscription that extends the limits and functionality of the bot. Phoenix Plus is handled through Discord, and starts at $5 a month. To buy Phoenix Plus or view all the perks, press the button below to get started.")
      .setColor(Colors.Orange)
      .setThumbnail("https://cdn.discordapp.com/emojis/1262930833770025062.png?size=512")
      .setTimestamp(new Date());
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setStyle(ButtonStyle.Premium).setSKUId(config.premiumId));
    return ctx.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  async status(ctx) {
    await ctx.defer();
    const entitlement = await this.fetchEntitlement(ctx.guild.id);
    if (!entitlement) return ctx.reply(`This server does not have Phoenix Plus. Use ${commandMention("plus info")} for more info about plus.`);
    return ctx.reply("This server has Phoenix Plus. You can use all of Phoenix's paid features for the duration of the plan.");
  }

  async test(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply(`${emoji("error")} This command is developer only.`);
    const entitlement = await this.fetchEntitlement(ctx.guild.id);
    const entitlements = this.container.client.application.entitlements;
    if (entitlement) {
      await entitlements.deleteTest(entitlement);
      return ctx.reply(`${emoji("success")} This server is no longer marked as test premium.`);
    }
    await entitlements.createTest({ sku: config.premiumId, guild: ctx.guild.id });
    return ctx.reply(`${emoji("success")} This server has been marked as test premium.`);
  }
}

module.exports = { PlusCommand };
