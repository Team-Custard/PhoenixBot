const { InteractionHandler, InteractionHandlerTypes } = require("@sapphire/framework");
const { MessageFlags } = require("discord.js");
const { peekSettings } = require("../tools/guildSettings");
const { sendLog, logEmbed } = require("../tools/logging");
const { parse } = require("../tools/textParser");
const { emoji } = require("../tools/errorReporter");

// Checks the code typed into the verification form (see verify.js) and gives the
// verified role. With verification logs on, this used to crash on every attempt
// because it referred to variables that didn't exist.
class VerifyModalHandler extends InteractionHandler {
  constructor(ctx, options) {
    super(ctx, { ...options, interactionHandlerType: InteractionHandlerTypes.ModalSubmit });
  }

  parse(interaction) {
    return interaction.customId.startsWith("verifyModal") ? this.some() : this.none();
  }

  async run(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const member = interaction.member;
    const guild = interaction.guild;
    const settings = await peekSettings(guild.id);
    const log = (text) => sendLog(guild, "verification", { embeds: [logEmbed(member.user, text)] }, settings);

    const code = interaction.customId.split("-")[1] ?? "";
    const typed = interaction.fields.getTextInputValue("verifyField");
    if (typed.toLowerCase() !== code.toLowerCase()) {
      await log(`${member} failed verification.`);
      return interaction.editReply(`${emoji("error")} Invalid code specified.`);
    }

    const roleId = settings?.verification?.role;
    if (!roleId) {
      return interaction.editReply(`${emoji("error")} Verification was not set up yet. Please bring this to your server's admin's attention.`);
    }
    const role = await guild.roles.fetch(roleId).catch(() => null);
    if (!role) {
      await log(`${member} was unable to verify due to a missing verified role.`);
      return interaction.editReply(`${emoji("error")} The verified role appears to have been deleted. Please bring this to your server's admin's attention.`);
    }

    try {
      await member.roles.add(role, "Verification");
    }
    catch (err) {
      console.error("[verify] Failed to give the verified role", err);
      await log(`${member} was unable to verify due to an error giving the role.`);
      return interaction.editReply(
        `${emoji("error")} I couldn't give you the verified role, most likely I don't have permission to hand out roles or the role is above my topmost role. Please bring this to your server's admin's attention.`,
      );
    }

    const unverified = settings.verification.unverifiedRole;
    if (unverified && member.roles.cache.has(unverified)) {
      await member.roles.remove(unverified, "Verification").catch(() => undefined);
    }
    await log(`${member} passed verification.`);
    return interaction.editReply(
      settings.verification.verifiedText
        ? `${emoji("success")} ${await parse(settings.verification.verifiedText, member)}`
        : `${emoji("success")} You have been verified. Enjoy this server!`,
    );
  }
}

module.exports = { VerifyModalHandler };
