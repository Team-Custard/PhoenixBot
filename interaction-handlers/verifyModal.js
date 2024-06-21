const {
  InteractionHandler,
  InteractionHandlerTypes,
} = require("@sapphire/framework");
const ServerSettings = require("../tools/SettingsSchema");

class MenuHandler extends InteractionHandler {
  constructor(ctx, options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
    });
  }

  parse(interaction) {
    if (!interaction.customId.startsWith("verifyModal")) return this.none();

    return this.some();
  }

  async run(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const code = interaction.customId.slice().trim().split("-")[1];

    const codeText = await interaction.fields.getTextInputValue("verifyField");
    if (codeText.toLowerCase() == code.toLowerCase()) {
      const db = await ServerSettings.findById(
        interaction.guild.id,
        ServerSettings.upsert,
      ).cacheQuery();

      if (!db.verification.role) {
        return interaction.followUp(
          `:x: Verification was not setup yet. Please bring this to your server's admin's attention.`,
        );
      }
      const role = await interaction.guild.roles
        .fetch(db.verification.role)
        .catch(() => undefined);
      if (!role) {
        return interaction.followUp(
          `:x: I couldn't find the verified role anymore as the role appears to have been deleted. You need to use the verification setup command again. Please bring this to your server's admin's attention.`,
        );
      }
      interaction.member.roles
        .add(role, `Verification`)
        .then(async () => {
          return interaction.followUp(
            db.verification.verifiedText
              ? `:white_check_mark: ${await require("../tools/textParser").parse(db.verification.verifiedText, interaction.member)}`
              : `:white_check_mark: You have been verified. Enjoy this server,`,
          );
        })
        .catch((err) => {
          console.error(err);
          return interaction.followUp(
            `:x: I couldn't give you the verified role, most likely I don't have permission to hand out roles or the role is above my topmost role. Please bring this to your server's admin's attention.`,
          );
        });
    } else {
      interaction.followUp(`:x: Invalid code specified.`);
    }
  }
}

module.exports = {
  MenuHandler,
};
