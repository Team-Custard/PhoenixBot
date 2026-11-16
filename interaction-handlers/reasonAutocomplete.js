const { InteractionHandler, InteractionHandlerTypes } = require("@sapphire/framework");
const { peekSettings } = require("../tools/guildSettings");

// Suggests the server's own reasons (Moderation page) in the reason box of the
// moderation commands. Unless the server requires them, what you type can still be used.
class ReasonAutocomplete extends InteractionHandler {
  constructor(ctx, options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.Autocomplete });
  }

  async parse(interaction) {
    if (interaction.commandName !== "mod" || !interaction.guildId) return this.none();
    const focused = interaction.options.getFocused(true);
    if (focused.name !== "reason") return this.none();

    const settings = await peekSettings(interaction.guildId);
    const reasons = (settings?.moderation?.reasons ?? []).filter(Boolean);
    const typed = String(focused.value ?? "").trim();
    const query = typed.toLowerCase();
    const matches = reasons.filter((r) => r.toLowerCase().includes(query));
    const choices = matches.map((r) => ({ name: r.slice(0, 100), value: r.slice(0, 100) }));
    // Offer what they typed too, when they're allowed to write their own.
    const exact = reasons.some((r) => r.toLowerCase() === query);
    // (Suggestions can only be 100 characters; longer reasons are just sent as typed.)
    if (typed && typed.length <= 100 && !exact && !settings?.moderation?.enforceReasons) {
      choices.unshift({ name: `Use: ${typed}`.slice(0, 100), value: typed.slice(0, 100) });
    }
    return this.some(choices.slice(0, 25));
  }

  run(interaction, choices) {
    return interaction.respond(choices);
  }
}

module.exports = { ReasonAutocomplete };
