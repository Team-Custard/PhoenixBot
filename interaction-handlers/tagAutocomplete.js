const { InteractionHandler, InteractionHandlerTypes } = require("@sapphire/framework");
const ServerSettings = require("../tools/SettingsSchema");
const builtInTags = require("../tools/infoStuff.json");

class TagAutocomplete extends InteractionHandler {
  constructor(ctx, options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.Autocomplete });
  }

  async parse(interaction) {
    if (interaction.commandName !== "tag" || !interaction.guildId) return this.none();
    const focused = interaction.options.getFocused(true);
    if (focused.name !== "name") return this.none();

    const db = await ServerSettings.findById(interaction.guildId).select("tags").lean().cacheQuery();
    const query = String(focused.value ?? "").toLowerCase();
    const choices = [...(db?.tags ?? []), ...builtInTags]
      .filter((tag) => tag.name && tag.name.toLowerCase().includes(query))
      .slice(0, 25)
      .map((tag) => ({ name: tag.name, value: tag.name }));
    return this.some(choices);
  }

  run(interaction, choices) {
    return interaction.respond(choices);
  }
}

module.exports = { TagAutocomplete };
