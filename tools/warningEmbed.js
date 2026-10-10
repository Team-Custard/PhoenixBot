const { EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { emoji } = require("./errorReporter");
const { CommandContext } = require("./CommandContext");

const TIMEOUT = 15_000;

function buildPrompt(reason, { footer, disabled = false } = {}) {
  const embed = new EmbedBuilder().setTitle("Confirm your action").setDescription(reason).setColor(Colors.Orange);
  if (footer) embed.setFooter({ text: footer });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Confirm")
      .setCustomId("ConfirmButton")
      .setEmoji(emoji("success"))
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setLabel("Cancel")
      .setCustomId("CancelButton")
      .setEmoji(emoji("error"))
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
  );
  return { embeds: [embed], components: [row] };
}

/**
 * Asks the user to confirm an action with buttons. Resolves true if they confirm.
 * @param {CommandContext|import("discord.js").Message} target A command context or a message to reply to.
 * @param {string} reason The text shown in the prompt.
 */
async function confirm(target, reason) {
  const userId = target instanceof CommandContext ? target.user.id : target.author.id;
  const prompt = await target.reply(buildPrompt(reason)).catch(() => undefined);
  // Deny the request if the prompt failed to send.
  if (!prompt) return false;

  try {
    const press = await prompt.awaitMessageComponent({
      filter: (i) => (i.customId === "ConfirmButton" || i.customId === "CancelButton") && i.user.id === userId,
      time: TIMEOUT,
    });
    await press.deferUpdate().catch(() => undefined);
    if (press.customId === "ConfirmButton") {
      await prompt.edit(buildPrompt(reason, { footer: "Confirmed.", disabled: true })).catch(() => undefined);
      return true;
    }
    await prompt.edit(buildPrompt(reason, { footer: "Declined.", disabled: true })).catch(() => undefined);
    return false;
  }
  catch {
    await prompt.edit(buildPrompt(reason, { footer: "Timed out.", disabled: true })).catch(() => undefined);
    return false;
  }
}

module.exports = {
  confirm,
  /** @deprecated Use confirm(). Kept for older commands. */
  warnMessage: confirm,
};
