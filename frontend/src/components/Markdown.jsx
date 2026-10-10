// A small renderer for the parts of Discord markdown people use in embeds, so the
// embed builder preview looks like the message will. It never uses innerHTML.

const INLINE = [
  { type: "placeholder", re: /\{\{\s*([\w.]+)\s*\}\}/ },
  { type: "code", re: /`([^`\n]+)`/ },
  { type: "link", re: /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/ },
  { type: "bold", re: /\*\*([\s\S]+?)\*\*/ },
  { type: "underline", re: /__([\s\S]+?)__/ },
  { type: "italic", re: /\*([^*\n]+?)\*|\b_([^_\n]+?)_\b/ },
  { type: "strike", re: /~~([\s\S]+?)~~/ },
  { type: "spoiler", re: /\|\|([\s\S]+?)\|\|/ },
  { type: "user", re: /<@!?(\d{17,20})>/ },
  { type: "role", re: /<@&(\d{17,20})>/ },
  { type: "channel", re: /<#(\d{17,20})>/ },
  { type: "emoji", re: /<(a?):(\w{2,32}):(\d{17,20})>/ },
  { type: "time", re: /<t:(-?\d{1,13})(?::([tTdDfFR]))?>/ },
  { type: "everyone", re: /@(everyone|here)\b/ },
  { type: "url", re: /https?:\/\/[^\s<]+[^\s<.,:;"')\]]/ },
];

function formatTime(seconds, style) {
  const date = new Date(Number(seconds) * 1000);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  if (style === "R") {
    const diff = (date.getTime() - Date.now()) / 1000;
    const units = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60], ["second", 1]];
    const [unit, size] = units.find(([, s]) => Math.abs(diff) >= s) ?? units[5];
    return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(Math.round(diff / size), unit);
  }
  const options = {
    t: { timeStyle: "short" },
    T: { timeStyle: "medium" },
    d: { dateStyle: "short" },
    D: { dateStyle: "long" },
    F: { dateStyle: "full", timeStyle: "short" },
  }[style] ?? { dateStyle: "long", timeStyle: "short" };
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function inline(text, ctx, keyPrefix = "") {
  const out = [];
  let rest = text;
  let key = 0;
  while (rest) {
    let best = null;
    for (const rule of INLINE) {
      const match = rule.re.exec(rest);
      if (match && (best === null || match.index < best.match.index)) best = { rule, match };
    }
    if (!best) {
      out.push(rest);
      break;
    }
    const { rule, match } = best;
    if (match.index > 0) out.push(rest.slice(0, match.index));
    const k = `${keyPrefix}${key++}`;
    const inner = (value) => inline(value, ctx, `${k}-`);
    switch (rule.type) {
      case "placeholder": {
        // Placeholders are highlighted, filled in with an example when there is one.
        const name = match[1].toLowerCase();
        const value = ctx.values && Object.hasOwn(ctx.values, name) ? ctx.values[name] : undefined;
        if (value === undefined) out.push(<span key={k} className="md-placeholder unknown" title="Not a placeholder Phoenix knows">{match[0]}</span>);
        else if (typeof value === "object") out.push(<span key={k} className="md-placeholder mention" title={match[0]}>{value.mention}</span>);
        else out.push(<span key={k} className="md-placeholder" title={match[0]}>{value || "(empty)"}</span>);
        break;
      }
      case "code": out.push(<code key={k}>{match[1]}</code>); break;
      case "link": out.push(<a key={k} href={match[2]} target="_blank" rel="noreferrer noopener">{inner(match[1])}</a>); break;
      case "bold": out.push(<strong key={k}>{inner(match[1])}</strong>); break;
      case "underline": out.push(<u key={k}>{inner(match[1])}</u>); break;
      case "italic": out.push(<em key={k}>{inner(match[1] ?? match[2])}</em>); break;
      case "strike": out.push(<s key={k}>{inner(match[1])}</s>); break;
      case "spoiler": out.push(<span key={k} className="md-spoiler" tabIndex={0}>{inner(match[1])}</span>); break;
      case "user": out.push(<span key={k} className="mention">@{ctx.userName?.(match[1]) ?? "user"}</span>); break;
      case "role": {
        const role = ctx.roles?.find((r) => r.id === match[1]);
        out.push(<span key={k} className="mention">@{role?.name ?? "unknown-role"}</span>);
        break;
      }
      case "channel": {
        const channel = ctx.channels?.find((c) => c.id === match[1]);
        out.push(<span key={k} className="mention">#{channel?.name ?? "unknown"}</span>);
        break;
      }
      case "emoji":
        out.push(<img key={k} className="md-emoji" alt={`:${match[2]}:`} src={`https://cdn.discordapp.com/emojis/${match[3]}.${match[1] ? "gif" : "png"}?size=48`} />);
        break;
      case "time": out.push(<span key={k} className="md-time">{formatTime(match[1], match[2])}</span>); break;
      case "everyone": out.push(<span key={k} className="mention">@{match[1]}</span>); break;
      case "url": out.push(<a key={k} href={match[0]} target="_blank" rel="noreferrer noopener">{match[0]}</a>); break;
      default: out.push(match[0]);
    }
    rest = rest.slice(match.index + match[0].length);
  }
  return out;
}

/**
 * @param {{ text: string, ctx?: { channels?: object[], roles?: object[], userName?: (id: string) => string }, blocks?: boolean }} props
 * blocks: false for titles and author names, which only get inline formatting.
 */
export function Markdown({ text, ctx = {}, blocks = true }) {
  if (!text) return null;
  if (!blocks) return <>{inline(text, ctx)}</>;

  const parts = [];
  const chunks = text.split(/(```[\s\S]*?```)/);
  chunks.forEach((chunk, chunkIndex) => {
    if (chunk.startsWith("```") && chunk.endsWith("```") && chunk.length >= 6) {
      const body = chunk.slice(3, -3).replace(/^[\w+-]*\n/, "");
      parts.push(<pre key={`c${chunkIndex}`} className="md-codeblock"><code>{body}</code></pre>);
      return;
    }
    const lines = chunk.split("\n");
    let quote = [];
    let list = [];
    const flushQuote = (i) => {
      if (!quote.length) return;
      parts.push(<blockquote key={`q${chunkIndex}-${i}`}>{quote.map((l, j) => <div key={j}>{inline(l, ctx) }{"\u200b"}</div>)}</blockquote>);
      quote = [];
    };
    const flushList = (i) => {
      if (!list.length) return;
      parts.push(<ul key={`l${chunkIndex}-${i}`}>{list.map((l, j) => <li key={j}>{inline(l, ctx)}</li>)}</ul>);
      list = [];
    };
    lines.forEach((line, i) => {
      const key = `${chunkIndex}-${i}`;
      const quoted = /^>>?>?\s?(.*)$/.exec(line);
      if (quoted && line.startsWith("> ")) {
        flushList(i);
        quote.push(quoted[1]);
        return;
      }
      flushQuote(i);
      const listed = /^\s*[-*]\s+(.*)$/.exec(line);
      if (listed) {
        list.push(listed[1]);
        return;
      }
      flushList(i);
      const heading = /^(#{1,3})\s+(.*)$/.exec(line);
      if (heading) {
        const Tag = `h${heading[1].length + 2}`;
        parts.push(<Tag key={key} className="md-heading">{inline(heading[2], ctx)}</Tag>);
        return;
      }
      const sub = /^-#\s+(.*)$/.exec(line);
      if (sub) {
        parts.push(<div key={key} className="md-subtext">{inline(sub[1], ctx)}</div>);
        return;
      }
      parts.push(<div key={key} className="md-line">{line ? inline(line, ctx) : "\u200b"}</div>);
    });
    flushQuote(lines.length);
    flushList(lines.length);
  });
  return <>{parts}</>;
}
