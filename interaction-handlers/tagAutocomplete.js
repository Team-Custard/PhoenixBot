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
      if (interaction.commandName !== `tag`) return this.none();

      const focusedOption = interaction.options.getFocused(true);
  
      switch (focusedOption.name) {
        case 'name': {
          // Search your API or similar. This is example code!
          const db = await serverSettings
            .findById(interaction.guild.id, serverSettings.upsert)
            .cacheQuery();

          // const searchResult = await myApi.searchForSomething(focusedOption.value);
  
          // Map the search results to the structure required for Autocomplete
          if (focusedOption.value) {
            const items = db?.tags.concat(require("../tools/infoStuff.json")).filter(tag => tag.name?.includes(focusedOption.value));
            if (items)
                return this.some(items.map((match) => ({ name: match.name, value: match.name })));
            else
                return this.none();
          }
          else {
            return this.some(db?.tags.concat(require("../tools/infoStuff.json")).map((match) => ({ name: match.name, value: match.name })));
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
  