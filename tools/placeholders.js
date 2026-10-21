// Placeholders like {{mention}} or {{servericon}} in welcome messages, level-up
// messages, tags, embeds, autoresponses, timed messages and sticky messages.
// One list, shared with the dashboard (which shows it and uses it for previews).

/**
 * Every placeholder. `image` ones are links that also work in an embed's image,
 * thumbnail and icon boxes. `only` limits where one makes sense.
 */
const PLACEHOLDERS = [
  { name: "mention", description: "Mentions the member", group: "Member" },
  { name: "username", description: "Their username", group: "Member" },
  { name: "displayname", description: "Their display name", group: "Member" },
  { name: "nickname", description: "Their name in this server", group: "Member" },
  { name: "userid", description: "Their user ID", group: "Member" },
  { name: "avatar", description: "Link to their avatar", group: "Member", image: true },
  { name: "serveravatar", description: "Link to their server avatar (or their avatar if they don't have one)", group: "Member", image: true },
  { name: "servername", description: "The server's name", group: "Server" },
  { name: "serverid", description: "The server's ID", group: "Server" },
  { name: "membercount", description: "How many members the server has", group: "Server" },
  { name: "servericon", description: "Link to the server's icon", group: "Server", image: true },
  { name: "serverbanner", description: "Link to the server's banner", group: "Server", image: true },
  { name: "channel", description: "Mentions the channel", group: "Channel" },
  { name: "channelname", description: "The channel's name", group: "Channel" },
  { name: "date", description: "Today's date, shown in each reader's time zone", group: "Time" },
  { name: "time", description: "The current time, shown in each reader's time zone", group: "Time" },
  { name: "datetime", description: "The date and time, shown in each reader's time zone", group: "Time" },
  { name: "level", description: "The new level", group: "Leveling", only: ["leveling"] },
  { name: "afkreason", description: "Why they're AFK", group: "AFK", only: ["afk"] },
  { name: "afksince", description: "How long ago they went AFK", group: "AFK", only: ["afk"] },
];

const TOKEN = /\{\{\s*([\w.]+)\s*\}\}/g;

function cdn(path, hash, size = 512) {
  if (!hash) return null;
  return `https://cdn.discordapp.com/${path}/${hash}.${hash.startsWith("a_") ? "gif" : "png"}?size=${size}`;
}

function defaultAvatar(userId) {
  try {
    return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(userId) >> 22n) % 6n)}.png`;
  }
  catch {
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }
}

/**
 * Builds the values placeholders read from. Takes discord.js objects (from the bot)
 * or plain API objects (from the dashboard, which talks to Discord over REST).
 * @param {object} source
 * @param {import("discord.js").GuildMember|object} [source.member]
 * @param {import("discord.js").User|object} [source.user]
 * @param {import("discord.js").Guild|object} [source.guild]
 * @param {import("discord.js").GuildChannel|object} [source.channel]
 * @param {Record<string,string>} [source.extra] Extra values, like { level: "5" }.
 * @param {Date} [source.now]
 */
function contextFrom({ member, user, guild, channel, extra = {}, now = new Date() } = {}) {
  user ??= member?.user;
  guild ??= member?.guild;
  const ctx = { extra, now };

  if (user) {
    const isDjs = typeof user.displayAvatarURL === "function";
    const avatarUrl = isDjs
      ? user.displayAvatarURL({ extension: "png", size: 512 })
      : cdn(`avatars/${user.id}`, user.avatar) ?? defaultAvatar(user.id);
    const memberAvatar = member
      ? typeof member.displayAvatarURL === "function"
        ? member.displayAvatarURL({ extension: "png", size: 512 })
        : cdn(`guilds/${guild?.id}/users/${user.id}/avatars`, member.avatar)
      : null;
    const globalName = user.globalName ?? user.global_name ?? null;
    ctx.user = {
      id: user.id,
      username: user.username,
      displayName: globalName || user.username,
      nickname: member?.nickname ?? member?.nick ?? null,
      avatarUrl,
      serverAvatarUrl: memberAvatar || avatarUrl,
    };
  }
  if (guild) {
    const isDjs = typeof guild.iconURL === "function";
    ctx.guild = {
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount ?? guild.approximate_member_count ?? null,
      iconUrl: isDjs ? guild.iconURL({ extension: "png", size: 512 }) : cdn(`icons/${guild.id}`, guild.icon),
      bannerUrl: isDjs ? guild.bannerURL?.({ extension: "png", size: 1024 }) ?? null : cdn(`banners/${guild.id}`, guild.banner, 1024),
    };
  }
  if (channel) ctx.channel = { id: channel.id, name: channel.name };
  return ctx;
}

const DATE = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });
const TIME = new Intl.DateTimeFormat("en-US", { timeStyle: "short", timeZone: "UTC" });

/** The value of one placeholder, or undefined if it isn't one. */
function valueOf(name, ctx, rich) {
  const key = name.toLowerCase();
  const u = ctx.user;
  const g = ctx.guild;
  const unix = Math.floor(ctx.now.getTime() / 1000);
  switch (key) {
    case "mention": return u ? (rich ? `<@${u.id}>` : `@${u.nickname || u.displayName}`) : undefined;
    case "username": return u?.username;
    case "displayname": return u?.displayName;
    case "nickname": return u ? u.nickname || u.displayName : undefined;
    case "userid": return u?.id;
    case "avatar": return u?.avatarUrl;
    case "serveravatar": return u?.serverAvatarUrl;
    case "servername": return g?.name;
    case "serverid": return g?.id;
    case "membercount": return g?.memberCount != null ? g.memberCount.toLocaleString("en-US") : undefined;
    case "servericon": return g ? g.iconUrl ?? "" : undefined;
    case "serverbanner": return g ? g.bannerUrl ?? "" : undefined;
    case "channel": return ctx.channel ? (rich ? `<#${ctx.channel.id}>` : `#${ctx.channel.name}`) : undefined;
    case "channelname": return ctx.channel?.name;
    // Discord shows <t:...> timestamps in each reader's own time zone, but only in
    // message text, embed descriptions and field values. Elsewhere use plain UTC.
    case "date": return rich ? `<t:${unix}:D>` : DATE.format(ctx.now);
    case "time": return rich ? `<t:${unix}:t>` : `${TIME.format(ctx.now)} UTC`;
    case "datetime": return rich ? `<t:${unix}:f>` : `${DATE.format(ctx.now)}, ${TIME.format(ctx.now)} UTC`;
    default: {
      // Only the extra values given, never things like "constructor" from Object itself.
      const extras = ctx.extra ?? {};
      const extra = Object.hasOwn(extras, key) ? extras[key] : Object.hasOwn(extras, name) ? extras[name] : undefined;
      // An extra value can differ between rich text and plain text: { rich, plain }.
      if (extra && typeof extra === "object") return rich ? extra.rich : extra.plain;
      return extra != null ? String(extra) : undefined;
    }
  }
}

/**
 * Replaces placeholders in text. Unknown placeholders are left as they are.
 * @param {string} text
 * @param {object} ctx From contextFrom().
 * @param {{ rich?: boolean }} [options] rich: false where Discord shows text as is
 *   (embed titles, author names, footers), so mentions and timestamps become plain text.
 */
const KNOWN = new Set(PLACEHOLDERS.filter((p) => !p.only).map((p) => p.name));

function render(text, ctx, { rich = true } = {}) {
  if (!text) return text;
  return String(text).replace(TOKEN, (match, name) => {
    const value = valueOf(name, ctx, rich);
    if (value !== undefined) return value;
    // A known placeholder with nothing to fill it (like {{mention}} in a timed message,
    // which isn't about anyone) becomes empty instead of showing the raw text.
    return KNOWN.has(name.toLowerCase()) ? "" : match;
  });
}

function renderUrl(value, ctx) {
  if (!value) return null;
  const out = render(value, ctx, { rich: false }).trim();
  try {
    const url = new URL(out);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  }
  catch {
    return null;
  }
}

/** Fills placeholders in stored embed data (see tools/embeds.js). Image boxes that end up empty are dropped. */
function renderEmbed(data, ctx) {
  if (!data) return data;
  // Filled-in placeholders can make text longer than Discord allows, which would make
  // Discord refuse the whole message, so everything is cut to fit.
  const cut = (v, max) => (v && v.length > max ? `${v.slice(0, max - 1)}…` : v);
  const plain = (v, max) => cut(render(v, ctx, { rich: false }), max);
  const rich = (v, max) => cut(render(v, ctx, { rich: true }), max);
  const out = {
    ...data,
    title: plain(data.title, 256),
    url: renderUrl(data.url, ctx),
    description: rich(data.description, 4096),
    author: { name: plain(data.author?.name, 256), icon_url: renderUrl(data.author?.icon_url, ctx), url: renderUrl(data.author?.url, ctx) },
    thumbnail: renderUrl(data.thumbnail, ctx),
    image: renderUrl(data.image, ctx),
    fields: (data.fields ?? []).map((f) => ({ ...f, name: plain(f.name, 256) || "\u200b", value: rich(f.value, 1024) || "\u200b" })),
    footer: { text: plain(data.footer?.text, 2048), icon_url: renderUrl(data.footer?.icon_url, ctx) },
  };
  // Discord allows 6000 characters across an embed; trim the description if needed.
  const total = [out.title, out.description, out.author.name, out.footer.text, ...out.fields.flatMap((f) => [f.name, f.value])]
    .reduce((sum, part) => sum + (part?.length ?? 0), 0);
  if (total > 6000 && out.description) out.description = cut(out.description, Math.max(1, out.description.length - (total - 6000)));
  return out;
}

/**
 * Builds a message from text and an optional saved embed, with placeholders filled.
 * Only the member it's about can be pinged.
 * @param {object} settings The server's settings (for saved embeds).
 * @param {{ content?: string, embed?: string|null }} message embed is a saved embed's name.
 * @param {object} ctx From contextFrom().
 * @returns {import("discord.js").MessageCreateOptions|null} null when there's nothing to send.
 */
function buildMessage(settings, message, ctx) {
  const { toDiscordEmbed, isEmptyEmbed } = require("./embeds");
  const content = render(message.content ?? "", ctx).slice(0, 2000);
  const saved = message.embed ? (settings?.embeds ?? []).find((e) => e.name === message.embed) : null;
  const data = saved ? renderEmbed(typeof saved.data?.toObject === "function" ? saved.data.toObject() : saved.data, ctx) : null;
  const embeds = data && !isEmptyEmbed(data) ? [toDiscordEmbed(data)] : [];
  if (!content.trim() && !embeds.length) return null;
  return {
    content: content || undefined,
    embeds,
    allowedMentions: { parse: [], users: ctx.user ? [ctx.user.id] : [] },
  };
}

/** The list for the dashboard. */
function placeholderList() {
  return PLACEHOLDERS.map(({ name, description, group, image, only }) => ({ name, description, group, image: Boolean(image), only: only ?? null }));
}

/** Older helper kept for callers that pass a member and get text back. */
async function parse(text, member, extra = {}) {
  return render(text, contextFrom({ member, extra }));
}

module.exports = { PLACEHOLDERS, contextFrom, render, renderEmbed, renderUrl, buildMessage, placeholderList, parse };
