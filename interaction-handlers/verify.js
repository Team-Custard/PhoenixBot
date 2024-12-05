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

// The code to generate a verification method. Code taken from https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
function makeid(length) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

class MenuHandler extends InteractionHandler {
  constructor(ctx, options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button,
    });
  }

  parse(interaction) {
    if (interaction.customId !== "verify") return this.none();

    return this.some();
  }

  async run(interaction) {
    const code = makeid(10);

    const modal = new ModalBuilder()
      .setCustomId("verifyModal-" + code.toUpperCase())
      .setTitle("Verification");

    const inputRow = new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("verifyField")
        .setPlaceholder(code.toUpperCase())
        .setMinLength(10)
        .setMaxLength(10)
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
        .setLabel(`Enter code "${code}" to verify`),
    );
    modal.addComponents(inputRow);

    await interaction.showModal(modal);
  }
}

module.exports = {
  MenuHandler,
};
