// The dashboard audit log: every change made on the dashboard is recorded with who
// made it, and optionally posted to the server's "Dashboard changes" log channel.
const { EmbedBuilder, Colors } = require("discord.js");
const DashboardAudit = require("../tools/models/DashboardAudit");
const ServerSettings = require("../tools/SettingsSchema");
const discord = require("./discord");

const MAX_TEXT = 300;
const MAX_ITEMS = 25;

/** Keeps stored values small: long text is cut, long lists are shortened. */
function compact(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value.length > MAX_TEXT ? `${value.slice(0, MAX_TEXT - 1)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    if (value.every((v) => typeof v === "string")) return value.slice(0, MAX_ITEMS).map(compact);
    return { count: value.length };
  }
  return compact(JSON.stringify(value));
}

/** One change as text for Discord. */
function show(type, value) {
  if (value === null || value === undefined) return "*none*";
  if (typeof value === "object" && !Array.isArray(value)) return `${value.count} ${value.count === 1 ? "entry" : "entries"}`;
  switch (type) {
    case "toggle": return value ? "On" : "Off";
    case "channel": return `<#${value}>`;
    case "role": return `<@&${value}>`;
    case "channels": return value.length ? value.map((id) => `<#${id}>`).join(", ") : "*none*";
    case "roles": return value.length ? value.map((id) => `<@&${id}>`).join(", ") : "*none*";
    case "duration": return value ? `${Math.round(value / 1000)}s` : "Off";
    default: return Array.isArray(value) ? (value.join(", ") || "*none*") : String(value);
  }
}

/**
 * Records a dashboard change.
 * @param {import("express").Request} req
 * @param {{ action: string, summary: string, changes?: { key?: string, label: string, type?: string, before?: any, after?: any }[] }} entry
 */
async function recordAudit(req, { action, summary, changes = [] }) {
  const guildId = req.params.guildId;
  const user = req.session?.user;
  if (!guildId || !user) return;
  const clean = changes.slice(0, 50).map((c) => ({ key: c.key, label: c.label, type: c.type ?? "text", before: compact(c.before), after: compact(c.after) }));
  try {
    await DashboardAudit.create({
      guildId,
      userId: user.id,
      username: user.globalName || user.username,
      avatar: user.avatar,
      action,
      summary,
      changes: clean,
    });
    await postToLogChannel(guildId, user, summary, clean);
  }
  catch (err) {
    // The change itself already happened; a failed audit entry shouldn't undo that.
    console.warn("[dashboard] Couldn't record an audit log entry", err.message);
  }
}

async function postToLogChannel(guildId, user, summary, changes) {
  const settings = await ServerSettings.findById(guildId).select("logging.dashboard").lean();
  const channelId = settings?.logging?.dashboard;
  if (!channelId) return;
  const embed = new EmbedBuilder()
    .setColor(Colors.Orange)
    .setAuthor({
      name: `${user.globalName || user.username} on the dashboard`,
      iconURL: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64` : undefined,
    })
    .setDescription(summary)
    .setFooter({ text: `User ID ${user.id}` })
    .setTimestamp(new Date());
  for (const change of changes.slice(0, 10)) {
    const value = `${show(change.type, change.before)} → ${show(change.type, change.after)}`;
    embed.addFields({ name: change.label.slice(0, 256), value: value.slice(0, 1024) });
  }
  if (changes.length > 10) embed.addFields({ name: "And more", value: `${changes.length - 10} more changes. See the dashboard's audit log.` });
  await discord.sendMessage(channelId, { embeds: [embed.toJSON()], allowed_mentions: { parse: [] } }).catch(() => undefined);
}

/** A page of a server's audit log, newest first. */
async function listAudit(guildId, { page = 0, userId = null, perPage = 25 } = {}) {
  const filter = { guildId };
  if (userId) filter.userId = userId;
  const [entries, total] = await Promise.all([
    DashboardAudit.find(filter).sort({ createdAt: -1 }).skip(page * perPage).limit(perPage).lean(),
    DashboardAudit.countDocuments(filter),
  ]);
  return {
    page,
    pages: Math.max(1, Math.ceil(total / perPage)),
    total,
    entries: entries.map(({ _id, ...e }) => ({ id: String(_id), ...e })),
  };
}

module.exports = { recordAudit, listAudit, compact, show };
