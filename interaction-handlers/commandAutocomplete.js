const {
    InteractionHandler,
    InteractionHandlerTypes,
  } = require("@sapphire/framework");
const {
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require("discord.js");
const serverSettings = require("../tools/SettingsSchema");

  
  class MenuHandler extends InteractionHandler {
    constructor(ctx, options) {
      super(ctx, {
        ...options,
        interactionHandlerType: InteractionHandlerTypes.Autocomplete,
      });
    }
  
    async parse(interaction) {
      if (
        interaction.commandName !== `toggle` &&
        interaction.commandName !== `override`
      ) return this.none();

      const focusedOption = interaction.options.getFocused(true);
  
      switch (focusedOption.name) {
        case 'command': {
          // Search your API or similar. This is example code!
          const db = await serverSettings
            .findById(interaction.guild.id, serverSettings.upsert)
            .cacheQuery();

          // const searchResult = await myApi.searchForSomething(focusedOption.value);
  
          // Map the search results to the structure required for Autocomplete
          if (focusedOption.value) {
            const cmd = this.container.client.stores
            .get("commands")
            .filter((i) => (i.name.includes(focusedOption.value)))
            if (cmd)
                return this.some(cmd.map((match) => ({ name: `${match.name}${db.disabledCommands.includes(match.name) ? ` (disabled)` : ``}`, value: match.name })).splice(0, 25));
            else
                return this.none();
          }
          else {
            // return this.some(cmd.map((match) => ({ name: `${match.name}${db.disabledCommands.includes(match) ? ` (disabled)` : ``}`, value: match.name })));
            return this.some(this.container.client.stores.get("commands").filter((i) => (i.name.includes(focusedOption.value))).map((match) => ({ name: `${match.name}${db.disabledCommands.includes(match) ? ` (disabled)` : ``}`, value: match.name })).splice(0, 25));
          }
          
        }
        default:
          return this.none();
      }  
    }
  
    async run(interaction, result) {
        return interaction.respond(result);
    }
  }
  
  module.exports = {
    MenuHandler,
  };
  