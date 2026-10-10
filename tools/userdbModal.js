const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

const field = (id, label, placeholder, maxLength, style = TextInputStyle.Short) =>
  new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId(id)
      .setLabel(label)
      .setPlaceholder(placeholder)
      .setMaxLength(maxLength)
      .setRequired(false)
      .setStyle(style),
  );

/** The UserDB setup form. Submissions are handled by interaction-handlers/userdbModal.js. */
function buildUserdbModal() {
  return new ModalBuilder()
    .setTitle("UserDB configuration")
    .setCustomId("userdbModal")
    .addComponents(
      field("timezoneField", "Your timezone (optional)", "America/New_York", 42),
      field("pronounField", "Your pronouns (optional)", "they/them", 12),
      field("descriptionField", "Your description (optional)", "Hello, I'm a Phoenix user.", 120, TextInputStyle.Paragraph),
      field("youtubeField", "Your youtube social (optional)", "@sylveondev", 24),
      field("twitterField", "Your twitter social (optional)", "@sylveondev", 24),
    );
}

module.exports = { buildUserdbModal };
