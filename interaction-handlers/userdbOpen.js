const { InteractionHandler, InteractionHandlerTypes } = require("@sapphire/framework");
const { buildUserdbModal } = require("../tools/userdbModal");

// The "Open UserDB setup" button sent by the prefix version of `userdb set`.
class UserdbOpenButton extends InteractionHandler {
  constructor(ctx, options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.Button });
  }

  parse(interaction) {
    return interaction.customId.startsWith("userdb-open-") ? this.some() : this.none();
  }

  async run(interaction) {
    if (!interaction.customId.endsWith(interaction.user.id)) {
      return interaction.reply({ content: "This button isn't for you. Use `userdb set` yourself.", ephemeral: true });
    }
    return interaction.showModal(buildUserdbModal());
  }
}

module.exports = { UserdbOpenButton };
