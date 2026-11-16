// A small RSS / Atom reader, enough for YouTube's channel feeds and ordinary blog,
// Mastodon or Reddit feeds. Not a full XML parser: it only picks out the few tags
// notifications need.

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };

function decode(text) {
  if (!text) return "";
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (match, code) => {
      if (code[0] === "#") {
        const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
        return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match;
      }
      return ENTITIES[code.toLowerCase()] ?? match;
    })
    .trim();
}

const escapeTag = (name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The text inside the first <name>...</name>. */
function tag(xml, name) {
  const match = new RegExp(`<${escapeTag(name)}(?:\\s[^>]*)?>([\\s\\S]*?)</${escapeTag(name)}>`, "i").exec(xml);
  return match ? decode(match[1]) : "";
}

/** An attribute of the first <name ...> tag (optionally one with rel="alternate" etc.). */
function attr(xml, name, attribute, where = null) {
  const tags = xml.match(new RegExp(`<${escapeTag(name)}\\b[^>]*>`, "gi")) ?? [];
  for (const t of tags) {
    if (where && !new RegExp(`\\b${where[0]}=["']${where[1]}["']`, "i").test(t)) continue;
    const match = new RegExp(`\\b${escapeTag(attribute)}=["']([^"']*)["']`, "i").exec(t);
    if (match) return decode(match[1]);
  }
  return "";
}

/**
 * @param {string} xml
 * @returns {{ title: string, items: { id: string, title: string, link: string, thumbnail: string, published: string, author: string, videoId: string }[] }}
 */
function parseFeed(xml) {
  const text = String(xml ?? "");
  const blocks = text.match(/<(entry|item)\b[\s\S]*?<\/\1>/gi) ?? [];
  const head = blocks.length ? text.slice(0, text.indexOf(blocks[0])) : text;
  const items = blocks.map((entry) => {
    const link = attr(entry, "link", "href", ["rel", "alternate"]) || attr(entry, "link", "href") || tag(entry, "link");
    const videoId = tag(entry, "yt:videoId");
    return {
      id: videoId || tag(entry, "id") || tag(entry, "guid") || link,
      videoId,
      title: tag(entry, "title"),
      link,
      thumbnail: attr(entry, "media:thumbnail", "url") || attr(entry, "media:content", "url") || attr(entry, "enclosure", "url"),
      published: tag(entry, "published") || tag(entry, "pubDate") || tag(entry, "updated"),
      author: tag(entry, "name") || tag(entry, "dc:creator") || tag(entry, "author"),
    };
  });
  return { title: tag(head, "title"), items: items.filter((i) => i.id) };
}

module.exports = { parseFeed, decode };
