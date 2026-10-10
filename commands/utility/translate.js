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
const { PhoenixCommand } = require("../../tools/PhoenixCommand");
const { emoji } = require("../../tools/errorReporter");
const { translateText } = require("../../tools/translator");
const UserDB = require("../../tools/UserDB");

const EVERYWHERE = {
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
};

class TranslateCommand extends PhoenixCommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "translate",
      description: "Translates text to your language.",
      examples: ["translate Hola", "translate Bonjour --deepl"],
      args: [
        { name: "text", type: "string", required: true, rest: true, maxLength: 1500, description: "The text to translate" },
        {
          name: "translator",
          type: "string",
          prefix: false,
          description: "The translator to use",
          choices: [{ name: "Google Translate", value: "google" }, { name: "DeepL", value: "deepl" }],
        },
        { name: "deepl", type: "boolean", aliases: ["d"], slash: false, description: "Use DeepL instead of Google" },
      ],
      contextMenus: [
        { name: "Translate message", type: ApplicationCommandType.Message, run: "translateMessageGoogle", ...EVERYWHERE },
        { name: "Translate message (DeepL)", type: ApplicationCommandType.Message, run: "translateMessageDeepl", ...EVERYWHERE },
      ],
      guildOnly: false,
      slash: { contexts: EVERYWHERE.contexts, integrationTypes: EVERYWHERE.integrationTypes },
      cooldownDelay: 3_000,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ["module"],
    });
  }

  async run(ctx, { text, translator, deepl }) {
    const engine = deepl ? "deepl" : translator ?? "google";
    // Prefix commands have no user locale, so they translate to English.
    const locale = ctx.isSlash ? ctx.locale : "en-US";
    await ctx.defer();
    try {
      const result = await translateText(text, { engine, locale });
      return ctx.reply({
        content: `${result.text}\n-# Translated using ${result.engine} • \`${result.from} => ${result.to}\``.slice(0, 2000),
        allowedMentions: { parse: [] },
      });
    }
    catch (err) {
      return ctx.reply(`${emoji("error")} ${err.message ?? err}`);
    }
  }

  translateMessageGoogle(interaction) {
    return this.translateMessage(interaction, "google");
  }

  translateMessageDeepl(interaction) {
    return this.translateMessage(interaction, "deepl");
  }

  /** @param {import("discord.js").MessageContextMenuCommandInteraction} interaction */
  async translateMessage(interaction, engine) {
    const prefs = await UserDB.findById(interaction.user.id).lean().catch(() => null);
    await interaction.deferReply(prefs?.ephemeral ? { flags: MessageFlags.Ephemeral } : {});

    const message = interaction.targetMessage;
    if (!message.content) return interaction.editReply(`${emoji("error")} That message has no text to translate.`);

    try {
      const result = await translateText(message.content, { engine, locale: interaction.locale });
      const toggle = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`userbotephemeral-${interaction.user.id}`)
          .setLabel("Toggle ephemeral")
          .setStyle(ButtonStyle.Secondary),
      );
      return interaction.editReply({
        content: `[${message.author.tag} said:](<${message.url}>) ${result.text}\n-# Translated using ${result.engine} • \`${result.from} => ${result.to}\``.slice(0, 2000),
        allowedMentions: { parse: [] },
        components: [toggle],
      });
    }
    catch (err) {
      return interaction.editReply(`${emoji("error")} ${err.message ?? err}`);
    }
  }
}

module.exports = { TranslateCommand };
