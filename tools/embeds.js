// Saved embeds (settings.embeds), shared by the /embed builder and the dashboard.
//
// Stored shape ("data"):
//   { color, author: { name, icon_url, url }, title, url, description, thumbnail, image,
//     fields: [{ name, value, inline }], footer: { text, icon_url }, timestamp }
// timestamp is milliseconds since 1970 (or null); color is a 0xRRGGBB number (or null
// for Phoenix orange).

const { Colors } = require("discord.js");

const LIMITS = {
  name: 15,
  title: 256,
  description: 4096,
  fields: 25,
  fieldName: 256,
  fieldValue: 1024,
  footer: 2048,
  author: 256,
  total: 6000,
  url: 2048,
};

/** How many embeds a server can save. */
const SAVED_LIMIT = { free: 15, premium: 100 };

class EmbedError extends Error {}

function text(value, max, label) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new EmbedError(`${label} must be text.`);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) throw new EmbedError(`${label} can be at most ${max} characters.`);
  return trimmed;
}

const HAS_PLACEHOLDER = /\{\{\s*[\w.]+\s*\}\}/;

function link(value, label) {
  const raw = text(value, LIMITS.url, label);
  if (!raw) return null;
  // Placeholders like {{avatar}} become links when the embed is sent.
  if (HAS_PLACEHOLDER.test(raw)) return raw;
  let url;
  try {
    url = new URL(raw);
  }
  catch {
    throw new EmbedError(`${label} must be a link starting with https://.`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new EmbedError(`${label} must be a link starting with https://.`);
  return url.href;
}

/** Validates embed data from the dashboard or the builder and returns the stored shape. */
function cleanEmbedData(input = {}) {
  if (!input || typeof input !== "object") throw new EmbedError("The embed is empty.");

  let color = null;
  if (input.color !== null && input.color !== undefined && input.color !== "") {
    color = Number(input.color);
    if (!Number.isInteger(color) || color < 0 || color > 0xffffff) throw new EmbedError("The color isn't valid.");
  }

  let timestamp = null;
  if (input.timestamp !== null && input.timestamp !== undefined && input.timestamp !== "") {
    timestamp = typeof input.timestamp === "number" ? input.timestamp : Date.parse(input.timestamp);
    if (!Number.isFinite(timestamp)) throw new EmbedError("The timestamp isn't a valid date.");
  }

  const fieldsInput = Array.isArray(input.fields) ? input.fields : [];
  if (fieldsInput.length > LIMITS.fields) throw new EmbedError(`An embed can have at most ${LIMITS.fields} fields.`);
  const fields = fieldsInput.map((field, index) => {
    const name = text(field?.name, LIMITS.fieldName, `Field ${index + 1} name`);
    const value = text(field?.value, LIMITS.fieldValue, `Field ${index + 1} text`);
    if (!name || !value) throw new EmbedError(`Field ${index + 1} needs both a name and text.`);
    return { name, value, inline: Boolean(field.inline) };
  });

  const data = {
    color,
    author: {
      name: text(input.author?.name, LIMITS.author, "Author name"),
      icon_url: link(input.author?.icon_url, "Author icon"),
      url: link(input.author?.url, "Author link"),
    },
    title: text(input.title, LIMITS.title, "Title"),
    url: link(input.url, "Title link"),
    description: text(input.description, LIMITS.description, "Description"),
    thumbnail: link(input.thumbnail, "Thumbnail"),
    image: link(input.image, "Image"),
    fields,
    footer: {
      text: text(input.footer?.text, LIMITS.footer, "Footer text"),
      icon_url: link(input.footer?.icon_url, "Footer icon"),
    },
    timestamp,
  };

  if (!data.author.name && (data.author.icon_url || data.author.url)) throw new EmbedError("The author needs a name to show an icon or link.");
  if (!data.footer.text && data.footer.icon_url) throw new EmbedError("The footer needs text to show an icon.");
  if (!data.title && data.url) throw new EmbedError("The title link needs a title.");

  const visible = data.title || data.description || data.author.name || data.footer.text || data.image || data.thumbnail || fields.length;
  if (!visible) throw new EmbedError("The embed is empty. Add a title, description, field or image.");

  const total = [data.title, data.description, data.author.name, data.footer.text, ...fields.flatMap((f) => [f.name, f.value])]
    .reduce((sum, part) => sum + (part?.length ?? 0), 0);
  if (total > LIMITS.total) throw new EmbedError(`All the text together can be at most ${LIMITS.total} characters (this has ${total}).`);

  return data;
}

/** True when an embed has nothing Discord would show (e.g. every placeholder was empty). */
function isEmptyEmbed(data = {}) {
  return !(data.title || data.description || data.author?.name || data.footer?.text || data.image || data.thumbnail || data.fields?.length);
}

/** Turns stored embed data into the JSON Discord expects (works with EmbedBuilder too). */
function toDiscordEmbed(data = {}) {
  const embed = { color: data.color ?? Colors.Orange };
  if (data.title) embed.title = data.title;
  if (data.url) embed.url = data.url;
  if (data.description) embed.description = data.description;
  if (data.author?.name) {
    embed.author = { name: data.author.name };
    if (data.author.icon_url) embed.author.icon_url = data.author.icon_url;
    if (data.author.url) embed.author.url = data.author.url;
  }
  if (data.thumbnail) embed.thumbnail = { url: data.thumbnail };
  if (data.image) embed.image = { url: data.image };
  if (data.fields?.length) embed.fields = data.fields.map((f) => ({ name: f.name, value: f.value, inline: Boolean(f.inline) }));
  if (data.footer?.text) {
    embed.footer = { text: data.footer.text };
    if (data.footer.icon_url) embed.footer.icon_url = data.footer.icon_url;
  }
  if (data.timestamp) embed.timestamp = new Date(data.timestamp).toISOString();
  return embed;
}

/** Stored data from an EmbedBuilder's JSON (used by the /embed builder when saving). */
function fromDiscordEmbed(json = {}) {
  return {
    color: json.color ?? null,
    author: { name: json.author?.name ?? null, icon_url: json.author?.icon_url ?? null, url: json.author?.url ?? null },
    title: json.title ?? null,
    url: json.url ?? null,
    description: json.description ?? null,
    thumbnail: json.thumbnail?.url ?? null,
    image: json.image?.url ?? null,
    fields: (json.fields ?? []).map((f) => ({ name: f.name, value: f.value, inline: Boolean(f.inline) })),
    footer: { text: json.footer?.text ?? null, icon_url: json.footer?.icon_url ?? null },
    timestamp: json.timestamp ? Date.parse(json.timestamp) : null,
  };
}

/** What still uses a saved embed (tags, autoresponses, timed and sticky messages), to stop it being deleted. */
function embedUsers(settings, name) {
  return [
    ...(settings.tags ?? []).filter((t) => t.embed === name).map((t) => `tag “${t.name}”`),
    ...(settings.autoresponses ?? []).flatMap((a, i) => (a.embed === name ? [`autoresponse ${i + 1}`] : [])),
    ...(settings.timedMessages ?? []).flatMap((t, i) => (t.embed === name ? [`timed message ${i + 1}`] : [])),
    ...(settings.stickyMessages ?? []).flatMap((t, i) => (t.embed === name ? [`sticky message ${i + 1}`] : [])),
  ];
}

/** "used by tag “faq”, autoresponse 2 and 3 more" */
function describeUsers(users) {
  return `${users.slice(0, 5).join(", ")}${users.length > 5 ? ` and ${users.length - 5} more` : ""}`;
}

module.exports = { LIMITS, SAVED_LIMIT, EmbedError, cleanEmbedData, toDiscordEmbed, fromDiscordEmbed, isEmptyEmbed, embedUsers, describeUsers };
