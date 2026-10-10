// Runs Phoenix's automod filters (tools/automod.js) on a message and acts on what
// they find: deletes the message, punishes the member and logs it.
const { EmbedBuilder, Colors, PermissionFlagsBits } = require("discord.js");
const { peekSettings } = require("./guildSettings");
const { yieldsToStaging } = require("./staging");
const { sendLog, truncate } = require("./logging");
const automod = require("./automod");
const { punish } = require("./punish");
const { formatDuration } = require("./moderation");

const ACTION_TEXT = { delete: "Deleted the message", warn: "Warned", mute: "Muted", kick: "Kicked", ban: "Banned" };

// Invite codes that lead to the server itself, so its own invites can be allowed.
const inviteCache = new Map();
async function ownInviteCodes(guild, codes) {
  const cached = inviteCache.get(guild.id);
  const fresh = cached && cached.expires > Date.now();
  // A code we haven't seen may be an invite made in the last few minutes: look again,
  // but not more than every 30 seconds.
  const unknown = codes.some((code) => !cached?.codes.has(code));
  if (fresh && (!unknown || Date.now() - cached.fetchedAt < 30_000)) return cached.codes;

  const own = new Set();
  if (guild.vanityURLCode) own.add(guild.vanityURLCode);
  if (guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuild)) {
    const invites = await guild.invites.fetch({ cache: false }).catch(() => null);
    invites?.forEach((invite) => own.add(invite.code));
  }
  inviteCache.set(guild.id, { codes: own, fetchedAt: Date.now(), expires: Date.now() + 10 * 60_000 });
  return own;
}

/**
 * @param {import("discord.js").Message} message
 * @param {{ edited?: boolean }} [options] Edits only get the content filters.
 */
async function runAutomod(message, { edited = false } = {}) {
  if (!message.inGuild() || message.author?.bot || message.webhookId || message.system) return;
  const settings = await peekSettings(message.guildId);
  const config = settings?.automod;
  if (!automod.anyFilterOn(config)) return;
  const member = message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
  if (automod.isExempt(config, member, message.channel)) return;
  if (await yieldsToStaging(message.guild)) return;

  const filters = config.filters;
  let hit = null;
  if (!edited) {
    hit = automod.checkHistory(filters, {
      id: message.id,
      guildId: message.guildId,
      channelId: message.channelId,
      authorId: message.author.id,
      content: message.content,
      createdTimestamp: message.createdTimestamp,
    });
  }

  if (!hit) {
    const codes = filters.invites?.enabled && filters.invites.allowOwnServer !== false ? automod.findInvites(message.content) : [];
    hit = automod.checkContent(filters, {
      content: message.content,
      // Count each person or role once, like Discord's own mention limit.
      mentionCount: message.mentions.users.size + message.mentions.roles.size + (message.mentions.everyone ? 1 : 0),
    }, { ownInviteCodes: codes.length ? await ownInviteCodes(message.guild, codes) : undefined });
  }
  if (!hit) return;

  const rule = filters[hit.filter];
  await deleteMessages(message, hit.messages);

  const action = rule.action ?? "delete";
  const reason = `${automod.LABELS[hit.filter]} (${hit.detail})`;
  let result = null;
  // Spam bursts and repeat offenders only get punished once every few seconds.
  // Start counting again after a spam or repeat hit, so the next message isn't another hit.
  if (hit.messages) automod.clearHistory(message.guildId, message.author.id);
  if (action !== "delete" && automod.shouldPunish(`${message.guildId}:${message.author.id}`)) {
    result = await punish({ member, settings, action, duration: rule.duration, reason, source: "Automod" });
  }

  if (config.notifyChannel !== false && automod.shouldPunish(`notice:${message.channelId}:${message.author.id}`, 5_000)) {
    const notice = await message.channel
      .send({ content: `${message.author}, ${automod.LABELS[hit.filter].toLowerCase()} isn't allowed here.`, allowedMentions: { users: [message.author.id] } })
      .catch(() => null);
    if (notice) setTimeout(() => notice.delete().catch(() => undefined), 6_000);
  }

  // One log entry per member and filter every few seconds, unless someone was punished.
  if (!result && !automod.shouldPunish(`log:${message.guildId}:${message.author.id}:${hit.filter}`, 5_000)) return;

  const done = action === "delete" || result?.ok;
  const actionText = action === "delete" || !result ? ACTION_TEXT.delete
    : result.ok ? `${ACTION_TEXT[action]}${(action === "mute" || action === "ban") && rule.duration ? ` for ${await formatDuration(rule.duration)}` : ""}${result.caseDoc ? ` (case ${result.caseDoc.caseId})` : ""}`
      : `Couldn't ${action} them. Check Phoenix's permissions and role position.`;

  const embed = new EmbedBuilder()
    .setColor(done ? Colors.Orange : Colors.Red)
    .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ size: 128 }) })
    .setTitle(`Automod: ${automod.LABELS[hit.filter]}`)
    .addFields(
      { name: "Member", value: `${message.author} (${message.author.id})`, inline: true },
      { name: "Channel", value: `${message.channel}`, inline: true },
      { name: "Action", value: actionText },
    )
    .setFooter({ text: hit.detail })
    .setTimestamp(new Date());
  if (message.content) embed.setDescription(truncate(message.content, 1000));
  await sendLog(message.guild, "automod", { embeds: [embed] }, settings);
}

async function deleteMessages(message, tracked) {
  const others = (tracked ?? []).filter((m) => m.id !== message.id);
  await message.delete().catch(() => undefined);
  // Spam: remove the rest of the burst too, grouped by channel.
  const byChannel = new Map();
  for (const m of others) byChannel.set(m.channelId, [...(byChannel.get(m.channelId) ?? []), m.id]);
  for (const [channelId, ids] of byChannel) {
    const channel = message.guild.channels.cache.get(channelId);
    if (!channel?.bulkDelete) continue;
    await (ids.length === 1 ? channel.messages.delete(ids[0]) : channel.bulkDelete(ids, true)).catch(() => undefined);
  }
}

module.exports = { runAutomod };
