const { InteractionHandler, InteractionHandlerTypes } = require("@sapphire/framework");
const { listReminders, shortId } = require("../tools/reminders");

// Suggests your own reminders for /remind cancel.
class ReminderAutocomplete extends InteractionHandler {
  constructor(ctx, options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.Autocomplete });
  }

  async parse(interaction) {
    if (interaction.commandName !== "remind") return this.none();
    const focused = interaction.options.getFocused(true);
    if (focused.name !== "id") return this.none();
    const query = String(focused.value ?? "").toLowerCase();
    const mine = await listReminders(interaction.user.id);
    const choices = mine
      .filter((r) => !query || r.text.toLowerCase().includes(query) || String(r._id).endsWith(query))
      .slice(0, 25)
      .map((r) => {
        const when = new Date(r.dueAt).toUTCString().replace(/:\d\d GMT$/, " UTC");
        return { name: `#${shortId(r._id)} ${r.text.slice(0, 50)} — ${when}`.slice(0, 100), value: String(r._id) };
      });
    return this.some(choices);
  }

  run(interaction, choices) {
    return interaction.respond(choices);
  }
}

module.exports = { ReminderAutocomplete };
