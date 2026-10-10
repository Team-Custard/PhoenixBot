const { Listener, Events } = require("@sapphire/framework");
const { EmbedBuilder, Colors, AutoModerationRuleTriggerType } = require("discord.js");
const { peekSettings } = require("../../tools/guildSettings");
const { yieldsToStaging } = require("../../tools/staging");
const { sendLog, truncate } = require("../../tools/logging");
const { punish } = require("../../tools/punish");
const { isExempt } = require("../../tools/automod");
const { formatDuration } = require("../../tools/moderation");

const TRIGGERS = {
  [AutoModerationRuleTriggerType.Keyword]: "Blocked words",
  [AutoModerationRuleTriggerType.Spam]: "Suspected spam",
  [AutoModerationRuleTriggerType.KeywordPreset]: "Commonly flagged words",
  [AutoModerationRuleTriggerType.MentionSpam]: "Mention spam",
  [AutoModerationRuleTriggerType.MemberProfile]: "Member profile",
};

// Discord sends one event per action of a rule (block, alert, timeout), so a single
// rule break can arrive two or three times.
const seen = new Map();
function firstTime(key) {
  const now = Date.now();
  if (seen.get(key) > now - 5_000) return false;
  seen.set(key, now);
  if (seen.size > 2_000) for (const [k, at] of seen) if (at < now - 5_000) seen.delete(k);
  return true;
}

// Punishes people who break Discord AutoMod rules that are linked on the dashboard
// (Discord AutoMod page). Phoenix needs Manage Server to receive these events.
class DiscordAutomod extends Listener {
  constructor(context, options) {
    super(context, { ...options, name: "discordAutomodExecution", event: Events.AutoModerationActionExecution });
  }

  /** @param {import("discord.js").AutoModerationActionExecution} execution */
  async run(execution) {
    const { guild, ruleId, userId } = execution;
    if (!firstTime(`${guild.id}:${ruleId}:${userId}`)) return;

    const settings = await peekSettings(guild.id);
    const link = settings?.automod?.discordRules?.find((r) => r.ruleId === ruleId);
    if (!link?.action) return;
    if (await yieldsToStaging(guild)) return;

    const member = execution.member ?? (await guild.members.fetch(userId).catch(() => null));
    if (!member) return;
    // The same people Phoenix's own filters leave alone (moderators, ignored roles and channels).
    const channel = execution.channelId ? guild.channels.cache.get(execution.channelId) : null;
    if (isExempt(settings.automod, member, channel)) return;

    const rule = execution.autoModerationRule ?? (await guild.autoModerationRules.fetch(ruleId).catch(() => null));
    const ruleName = rule?.name ?? "a Discord AutoMod rule";
    const detail = execution.matchedKeyword ? ` (matched “${execution.matchedKeyword}”)` : "";
    const reason = `Broke the AutoMod rule “${ruleName}”${detail}`;

    const result = await punish({ member, settings, action: link.action, duration: link.duration, reason, source: "Discord AutoMod" });

    const actionText = result.ok
      ? `${{ warn: "Warned", mute: "Muted", kick: "Kicked", ban: "Banned" }[link.action]}${(link.action === "mute" || link.action === "ban") && link.duration ? ` for ${await formatDuration(link.duration)}` : ""}${result.caseDoc ? ` (case ${result.caseDoc.caseId})` : ""}`
      : `Couldn't ${link.action} them. Check Phoenix's permissions and role position.`;
    const embed = new EmbedBuilder()
      .setColor(result.ok ? Colors.Orange : Colors.Red)
      .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL({ size: 128 }) })
      .setTitle(`Discord AutoMod: ${ruleName}`)
      .addFields(
        { name: "Member", value: `${member} (${member.id})`, inline: true },
        { name: "Rule type", value: TRIGGERS[execution.ruleTriggerType] ?? "Unknown", inline: true },
        { name: "Action", value: actionText },
      )
      .setTimestamp(new Date());
    if (execution.channelId) embed.addFields({ name: "Channel", value: `<#${execution.channelId}>`, inline: true });
    if (execution.content) embed.setDescription(truncate(execution.content, 1000));
    if (execution.matchedKeyword) embed.setFooter({ text: `Matched: ${execution.matchedKeyword}` });
    await sendLog(guild, "automod", { embeds: [embed] }, settings);
  }
}

module.exports = { DiscordAutomod };
