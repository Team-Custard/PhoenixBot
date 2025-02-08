const { ButtonInteraction, Colors } = require("discord.js");

const {
    InteractionHandler,
    InteractionHandlerTypes,
  } = require("@sapphire/framework");
  
  class MenuHandler extends InteractionHandler {
    constructor(ctx, options) {
      super(ctx, {
        ...options,
        interactionHandlerType: InteractionHandlerTypes.Button,
      });
    }
  
    parse(interaction) {
      if (
        interaction.customId.startsWith("displayAvatar")
      ) {
        return this.some();
      }
  
      return this.none();
    }
  
    /**
     * @param {ButtonInteraction} interaction 
     */
    async run(interaction) {
      if (interaction.customId.startsWith("displayAvatar")) {
        if (interaction.customId.endsWith('OLD')) {
          interaction.reply({
            embeds: [{
                title: `Old avatar`,
                url: interaction.message.embeds.at(1).data.thumbnail.url,
                color: Colors.Orange,
                image: {url: interaction.message.embeds.at(1).data.thumbnail.url}
            }],
            ephemeral: true
          });
        }
        else if (interaction.customId.endsWith('NEW')) {
            interaction.reply({
              embeds: [{
                  title: `New avatar`,
                  url: interaction.message.embeds.at(2).data.thumbnail.url,
                  color: Colors.Orange,
                  image: {url: interaction.message.embeds.at(2).data.thumbnail.url}
              }],
              ephemeral: true
            });
          }
      }
    }
  }
  
  module.exports = {
    MenuHandler,
  };
  