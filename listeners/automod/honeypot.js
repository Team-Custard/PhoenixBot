const { Listener, Events } = require("@sapphire/framework");
const { EmbedBuilder, Colors, PermissionFlagsBits } = require("discord.js");
const { peekSettings } = require("../../tools/guildSettings");
const { yieldsToStaging } = require("../../tools/staging");
const { sendLog, truncate } = require("../../tools/logging");
const { punish } = require("../../tools/punish");
const { shouldPunish } = require("../../tools/automod");

const ACTION_TEXT = { kick: "Kicked", shadowban: "Shadowbanned", ban: "Banned" };

function outcomeText(result, action) {
  const caseText = result.caseDoc ? ` (case ${result.caseDoc.caseId})` : "";
  switch (result.outcome) {
    case "softban": return `Kicked${caseText}, and their messages from the past hour were deleted`;
    case "softban-still-banned": return `Banned${caseText}: meant as a kick that cleans up their messages, but the ban couldn't be lifted again`;
    case "ban": return `Banned${caseText}${result.cleanedUp ? ", and their messages from the past hour were deleted" : ""}`;
    default: return `${ACTION_TEXT[action]}${caseText}`;
  }
}

// The honeypot channel: a channel no real member should post in (the warning says
// so). Spam bots post everywhere, so whoever posts there is punished right away.
class Honeypot extends Listener {
  constructor(context, options) {
    super(context, { ...options, name: "automodHoneypot", event: Events.MessageCreate });
  }

  /** @param {import("discord.js").Message} message */
  async run(message) {
    if (!message.inGuild() || message.author.bot || message.webhookId || message.system) return;
    const settings = await peekSettings(message.guildId);
    const honeypot = settings?.automod?.honeypot;
    if (!honeypot?.channel || honeypot.channel !== message.channelId) return;

    const member = message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
    if (!member) return;
    // Moderators can post there (for example the warning) without being caught.
    if (member.id === message.guild.ownerId || member.permissions.any([PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.Administrator])) return;
    if (await yieldsToStaging(message.guild)) return;

    await message.delete().catch(() => undefined);
    // Bots often post several messages at once; punish once.
    if (!shouldPunish(`honeypot:${message.guildId}:${member.id}`, 30_000)) return;

    const action = ["kick", "shadowban", "ban"].includes(honeypot.action) ? honeypot.action : "ban";
    const cleanup = honeypot.cleanup !== false;
    const result = await punish({
      member,
      settings,
      action,
      reason: "Posted in the honeypot channel",
      source: "Honeypot",
      cleanup,
    });
    result.cleanedUp = cleanup;

    const embed = new EmbedBuilder()
      .setColor(result.ok ? Colors.Orange : Colors.Red)
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ size: 128 }) })
      .setTitle("Automod: Honeypot")
      .addFields(
        { name: "Member", value: `${message.author} (${message.author.id})`, inline: true },
        { name: "Channel", value: `${message.channel}`, inline: true },
        {
          name: "Action",
          value: result.ok ? outcomeText(result, action) : `Deleted the message, but couldn't ${action} them. Check Phoenix's permissions and role position.`,
        },
      )
      .setTimestamp(new Date());
    if (message.content) embed.setDescription(truncate(message.content, 1000));
    await sendLog(message.guild, "automod", { embeds: [embed] }, settings);
  }
}

module.exports = { Honeypot };
