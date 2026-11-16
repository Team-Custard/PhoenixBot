// Example values for placeholders, so previews on the dashboard look like the real
// thing. The logged-in person stands in for the member. The real values are filled in
// by the bot (tools/placeholders.js).
import { userAvatar } from "./api.js";

const TOKEN = /\{\{\s*([\w.]+)\s*\}\}/g;
export const HAS_PLACEHOLDER = /\{\{\s*[\w.]+\s*\}\}/;

function cdn(path, hash, size = 512) {
  if (!hash) return "";
  return `https://cdn.discordapp.com/${path}/${hash}.${hash.startsWith("a_") ? "gif" : "png"}?size=${size}`;
}

/** name -> example value. `mention` and `channel` come back as { mention } for styling. */
export function sampleValues(data, me, extra = {}) {
  const now = new Date();
  const name = me?.globalName || me?.username || "member";
  const avatar = me ? userAvatar(me, 512) : "https://cdn.discordapp.com/embed/avatars/0.png";
  const channel = data?.channels?.find((c) => c.type === 0);
  return {
    mention: { mention: `@${name}` },
    username: me?.username ?? "member",
    displayname: name,
    nickname: name,
    userid: me?.id ?? "0",
    avatar,
    serveravatar: avatar,
    servername: data?.guild?.name ?? "your server",
    serverid: data?.guild?.id ?? "0",
    membercount: (data?.guild?.memberCount ?? 1024).toLocaleString(),
    servericon: cdn(`icons/${data?.guild?.id}`, data?.guild?.icon),
    serverbanner: cdn(`banners/${data?.guild?.id}`, data?.guild?.banner, 1024),
    channel: { mention: `#${channel?.name ?? "general"}` },
    channelname: channel?.name ?? "general",
    date: now.toLocaleDateString(undefined, { dateStyle: "long" }),
    time: now.toLocaleTimeString(undefined, { timeStyle: "short" }),
    datetime: now.toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" }),
    level: "5",
    afkreason: "Eating dinner",
    afksince: "5 minutes ago",
    // Words typed after a tag's name: {{args}}, {{args.1}}, {{args.2}}...
    args: "some words",
    ...Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`args.${i + 1}`, ["some", "words"][i] ?? ""])),
    action: "Banned",
    reason: "Spamming",
    duration: "1 day",
    case: "42",
    moderator: { mention: `@${name}` },
    warnings: "2",
    emoji: "✅",
    creator: "Phoenix Gaming",
    title: "Building a bot in one day",
    link: "https://youtu.be/dQw4w9WgXcQ",
    platform: "YouTube",
    game: "Minecraft",
    thumbnail: "https://cdn.discordapp.com/embed/avatars/1.png",
    ...extra,
  };
}

// {{random: one | two}}: previews show the first choice.
export const RANDOM = /\{\{\s*(?:random|choose)\s*:((?:[^{}]|\{\{[^{}]*\}\})*)\}\}/i;
const RANDOM_ALL = new RegExp(RANDOM.source, "gi");

/** The choices in a {{random: ...}} body (splits on | outside nested placeholders). */
export function randomChoices(body) {
  const choices = [];
  let level = 0;
  let current = "";
  for (let i = 0; i < body.length; i++) {
    if (body.startsWith("{{", i)) {
      level++;
      current += "{{";
      i++;
    }
    else if (body.startsWith("}}", i)) {
      level--;
      current += "}}";
      i++;
    }
    else if (body[i] === "|" && level === 0) {
      choices.push(current.trim());
      current = "";
    }
    else current += body[i];
  }
  choices.push(current.trim());
  return choices;
}

/** Plain text with placeholders filled in (for image links and the like). */
export function fillText(text, values) {
  if (!text) return text;
  return String(text).replace(RANDOM_ALL, (match, body) => randomChoices(body)[0] ?? "").replace(TOKEN, (match, key) => {
    const value = Object.hasOwn(values, key.toLowerCase()) ? values[key.toLowerCase()] : undefined;
    if (value === undefined) return match;
    return typeof value === "object" ? value.mention : value;
  });
}

/** An image link with placeholders filled in, or null if it isn't a usable link. */
export function fillUrl(text, values) {
  const out = fillText(text ?? "", values).trim();
  return /^https?:\/\/\S+$/.test(out) ? out : null;
}
