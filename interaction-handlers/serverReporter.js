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

class MenuHandler extends InteractionHandler {
  constructor(ctx, options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button,
    });
  }

  parse(interaction) {
    if (!interaction.customId.startsWith("reportServer")) return this.none();

    return this.some();
  }

  async run(interaction) {
    const serverid = interaction.customId.slice().trim().split("-")[1];

    const modal = new ModalBuilder()
      .setCustomId("reportModal-" + serverId)
      .setTitle("Report server");

    const inputRow = new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("reportField")
        .setPlaceholder("What is wrong with this welcome message?")
        .setMinLength(8)
        .setMaxLength(512)
        .setRequired(true)
        .setStyle(TextInputStyle.Paragraph)
        .setLabel(`Report reason`)
    );
    modal.addComponents(inputRow);

    await interaction.showModal(modal);
  }
}

module.exports = {
  MenuHandler,
};
