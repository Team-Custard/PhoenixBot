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
  { name: "random", description: "Picks one of the choices at random, each time", group: "Text", insert: "{{random: first | second | third}}" },
  { name: "args", description: "Everything typed after the tag's name, or after an autoresponse's trigger", group: "Text", only: ["tags", "autoresponses"] },
  { name: "args.1", description: "Just the first word of it ({{args.2}} is the second word, and so on)", group: "Text", only: ["tags", "autoresponses"] },
  { name: "action", description: "What was done, like Banned or Warned", group: "Moderation", only: ["moderation"] },
  { name: "reason", description: "The reason given", group: "Moderation", only: ["moderation"] },
  { name: "duration", description: "How long it lasts (empty when it doesn't run out)", group: "Moderation", only: ["moderation"] },
  { name: "case", description: "The case number", group: "Moderation", only: ["moderation"] },
  { name: "moderator", description: "The moderator who did it", group: "Moderation", only: ["moderation"] },
  { name: "warnings", description: "How many warnings the member has now (for warnings)", group: "Moderation", only: ["moderation"] },
  { name: "emoji", description: "The server's success emoji", group: "Moderation", only: ["moderation"] },
  { name: "creator", description: "The creator's name", group: "Notification", only: ["notifications"] },
  { name: "title", description: "The video, stream or post title", group: "Notification", only: ["notifications"] },
  { name: "link", description: "Link to the video, stream or post", group: "Notification", only: ["notifications"] },
  { name: "platform", description: "Where it was posted, like YouTube", group: "Notification", only: ["notifications"] },
  { name: "game", description: "What's being streamed (Twitch)", group: "Notification", only: ["notifications"] },
  { name: "thumbnail", description: "Link to the video or stream's thumbnail", group: "Notification", only: ["notifications"], image: true },
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
      // Words typed after a tag's name or an autoresponse's trigger: {{args}}, {{args.2}}.
      if (key === "args" || /^args\.\d+$/.test(key)) {
        const args = ctx.extra?.args;
        if (!Array.isArray(args)) return undefined;
        if (key === "args") return args.join(" ");
        return args[Number(key.slice(5)) - 1] ?? "";
      }
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

// {{random: one | two | three}} picks a choice each time. Choices can hold other
// placeholders ({{random: Hi {{mention}} | Hello}}), and one level of {{random:}} inside.
const RANDOM_START = /\{\{\s*(?:random|choose)\s*:/i;

function expandRandom(text, pick = Math.random) {
  let out = String(text);
  for (let guard = 0; guard < 50; guard++) {
    const start = RANDOM_START.exec(out);
    if (!start) break;
    // Find the matching "}}", skipping placeholders inside the choices.
    let depth = 1;
    let i = start.index + start[0].length;
    const bodyStart = i;
    while (i < out.length && depth > 0) {
      if (out.startsWith("{{", i)) {
        depth++;
        i += 2;
      }
      else if (out.startsWith("}}", i)) {
        depth--;
        i += 2;
      }
      else {
        i++;
      }
    }
    if (depth > 0) break;
    const body = out.slice(bodyStart, i - 2);
    // Split on | that isn't inside a nested placeholder.
    const choices = [];
    let level = 0;
    let current = "";
    for (let j = 0; j < body.length; j++) {
      if (body.startsWith("{{", j)) {
        level++;
        current += "{{";
        j++;
      }
      else if (body.startsWith("}}", j)) {
        level--;
        current += "}}";
        j++;
      }
      else if (body[j] === "|" && level === 0) {
        choices.push(current);
        current = "";
      }
      else {
        current += body[j];
      }
    }
    choices.push(current);
    const options = choices.map((c) => c.trim());
    const chosen = options[Math.min(options.length - 1, Math.floor(pick() * options.length))] ?? "";
    out = out.slice(0, start.index) + chosen + out.slice(i);
  }
  return out;
}

function render(text, ctx, { rich = true } = {}) {
  if (!text) return text;
  return expandRandom(text).replace(TOKEN, (match, name) => {
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
  return PLACEHOLDERS.map(({ name, description, group, image, only, insert }) => ({ name, description, group, image: Boolean(image), only: only ?? null, insert: insert ?? null }));
}

/** Older helper kept for callers that pass a member and get text back. */
async function parse(text, member, extra = {}) {
  return render(text, contextFrom({ member, extra }));
}

module.exports = { PLACEHOLDERS, contextFrom, render, expandRandom, renderEmbed, renderUrl, buildMessage, placeholderList, parse };
