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
          if (interaction.message.embeds[0].thumbnail.height == 0) return interaction.reply({ 
            embeds: [{
              title: 'There\'s nothing here!',
              description: `Oops, I was not able to save the old avatar of this user, the old avatar was not archived. This can be for a number of reasons, but a likely reason is the old avatar was not cached by cloudflare in our region.`,
              color: Colors.Orange
            }],
            ephemeral: true 
          })
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
  