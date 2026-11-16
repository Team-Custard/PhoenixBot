const { container } = require("@sapphire/framework");
const { EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../config.json");
const webhookFetch = require("./webhookFetch");

const SUPPORT_FOOTER = `-# This error was logged. [Need help?](<https://discord.gg/PnUYnBbxER> "Invite link to the support server")`;

// A server's own status emojis (General page), for everything said while running one
// of its commands. AsyncLocalStorage carries them through every await without having
// to pass the server around (see withServerEmojis).
const { AsyncLocalStorage } = require("node:async_hooks");
const serverEmojis = new AsyncLocalStorage();
const STATUS_EMOJIS = ["success", "error", "warning", "info"];

/** Returns one of the bot's status emojis, with a plain fallback before they're loaded. */
function emoji(name) {
  const own = serverEmojis.getStore()?.[name];
  if (own) return own;
  const fallback = { success: "✅", warning: "⚠️", info: "❔", error: "❌", loading: "⭕" };
  return container.emojis?.[name] ?? fallback[name] ?? "";
}

/**
 * Runs fn with the server's own success, error, warning and info emojis in effect for
 * emoji(). Servers that haven't picked any just run fn.
 */
async function withServerEmojis(guildId, fn) {
  if (!guildId) return fn();
  let own = null;
  try {
    const { peekSettings } = require("./guildSettings");
    const settings = await peekSettings(guildId);
    const picked = settings?.statusEmojis;
    if (picked && STATUS_EMOJIS.some((name) => picked[name])) own = Object.fromEntries(STATUS_EMOJIS.map((name) => [name, picked[name] || null]));
  }
  catch {
    // Settings unavailable: Phoenix's own emojis.
  }
  // Always a fresh scope, so nothing carries over from whatever ran this.
  return serverEmojis.run(own ?? {}, fn);
}

/**
 * Logs an error to the console and, when enabled, to the error webhook channel.
 * @param {string} title Short description of where the error happened.
 * @param {unknown} error
 */
async function report(title, error) {
  console.error(`[error] ${title}`, error);
  if (!config.process.errorwebhook || !process.env.errwebhookid) return;

  const client = container.client;
  if (!client?.user) return;

  const stack = String(error?.stack ?? error).slice(0, 3900);
  const embed = new EmbedBuilder()
    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
    .setTitle(title.slice(0, 256))
    .setDescription(`\`\`\`${stack}\`\`\``)
    .setColor(Colors.Orange)
    .setFooter({ text: `Error occured${client.cluster ? ` • Cluster ${client.cluster.id}` : ""}` })
    .setTimestamp(new Date());

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel(`Fix the bug`)
      .setURL(`https://github.com/team-custard/phoenixbot/tree/staging`),
  );

  await webhookFetch.send(process.env.errwebhookid, {
    username: client.user.username,
    avatarURL: client.user.displayAvatarURL({ size: 512, extension: "png" }),
    embeds: [embed],
    components: [actionRow],
  });
}

/** The message shown to a user when their command errored. */
function userErrorMessage(error) {
  return `${emoji("error")} ${error}\n${SUPPORT_FOOTER}`;
}

/** Replies to an interaction whether or not it has already been deferred/replied to. */
async function replyToInteraction(interaction, content) {
  const payload = typeof content === "string" ? { content } : content;
  try {
    if (interaction.deferred || interaction.replied) return await interaction.editReply(payload);
    return await interaction.reply({ ...payload, ephemeral: true });
  }
  catch (err) {
    console.error(`[error] Failed to send an error reply`, err);
    return undefined;
  }
}

module.exports = {
  emoji,
  withServerEmojis,
  STATUS_EMOJIS,
  report,
  userErrorMessage,
  replyToInteraction,
};
