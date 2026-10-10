const { InteractionHandler, InteractionHandlerTypes } = require("@sapphire/framework");

// Suggests command names for /help.
class CommandAutocomplete extends InteractionHandler {
  constructor(ctx, options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.Autocomplete });
  }

  parse(interaction) {
    if (interaction.commandName !== "help") return this.none();
    const focused = interaction.options.getFocused(true);
    if (focused.name !== "command") return this.none();

    const query = String(focused.value ?? "").toLowerCase();
    const choices = [...this.container.stores.get("commands").values()]
      .filter((c) => (!c.isSlashGroup || c.subcommandDefs) && c.category !== "dev")
      .filter((c) => c.name.includes(query) || c.aliases.some((a) => a.includes(query)))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 25)
      .map((c) => ({ name: c.name, value: c.name }));
    return this.some(choices);
  }

  run(interaction, choices) {
    return interaction.respond(choices);
  }
}

module.exports = { CommandAutocomplete };
