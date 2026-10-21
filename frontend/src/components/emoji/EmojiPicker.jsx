// The emoji picker: every standard emoji plus the server's own, with search, recents
// and skin tones. Opened by EmojiField's button or by EmojiSelect.
import { memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ServerEmojis, customEmojiText, customEmojiUrl } from "./emojiShared.js";

let groupsPromise = null;
function loadGroups() {
  groupsPromise ??= import("./emojiData.js").then((m) => m.GROUPS).catch((err) => {
    groupsPromise = null;
    throw err;
  });
  return groupsPromise;
}

const TONES = ["", "\u{1F3FB}", "\u{1F3FC}", "\u{1F3FD}", "\u{1F3FE}", "\u{1F3FF}"];
const TONE_SAMPLE = ["✋", "✋🏻", "✋🏼", "✋🏽", "✋🏾", "✋🏿"];
const HANDSHAKE = "\u{1F91D}";
const MODIFIER_BASE = /\p{Emoji_Modifier_Base}/u;

/** Adds a skin tone after each person in the emoji (but not the handshake in "people holding hands"). */
export function withTone(emoji, tone) {
  if (!tone) return emoji;
  const points = [...emoji];
  const zwj = points.includes("‍");
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    out.push(point);
    if (MODIFIER_BASE.test(point) && !(zwj && point === HANDSHAKE)) {
      out.push(TONES[tone]);
      if (points[i + 1] === "️") i++;
    }
  }
  return out.join("");
}

function readStore(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  }
  catch {
    return fallback;
  }
}
function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  }
  catch {
    // Private windows and blocked storage: recents just aren't remembered.
  }
}

const RECENTS_KEY = "phoenix-emoji-recents";
const TONE_KEY = "phoenix-emoji-tone";
const MAX_RECENTS = 18;
const NO_EMOJIS = [];
const WIDTH = 368;
const HEIGHT = 432;

function usePosition(anchorRef, rootRef) {
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    const update = (next) => setPos((prev) => (prev && prev.sheet === next.sheet && prev.left === next.left && prev.top === next.top ? prev : next));
    function place(event) {
      // Scrolling the picker's own grid doesn't move it.
      if (event?.target instanceof Node && rootRef.current?.contains(event.target)) return;
      const anchor = anchorRef.current;
      if (!anchor) return;
      if (window.innerWidth < 560 || window.innerHeight < HEIGHT + 16) {
        update({ sheet: true });
        return;
      }
      const rect = anchor.getBoundingClientRect();
      const left = Math.min(Math.max(8, rect.right - WIDTH), window.innerWidth - WIDTH - 8);
      let top = rect.bottom + 6;
      if (top + HEIGHT > window.innerHeight - 8) {
        top = rect.top - HEIGHT - 6 >= 8 ? rect.top - HEIGHT - 6 : Math.max(8, window.innerHeight - HEIGHT - 8);
      }
      update({ sheet: false, left, top });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchorRef, rootRef]);
  return pos;
}

const Cell = memo(function Cell({ item, onPick, onHover }) {
  return (
    <button
      type="button"
      className="ep-cell"
      data-emoji-cell=""
      aria-label={item.label}
      title={item.label}
      onClick={(e) => onPick(item, e)}
      onMouseEnter={() => onHover(item)}
      onFocus={() => onHover(item)}
    >
      {item.custom ? <img src={customEmojiUrl(item.custom.id, item.custom.animated)} alt="" loading="lazy" width={28} height={28} /> : <span>{item.text}</span>}
    </button>
  );
});

/**
 * @param {{ anchorRef: React.RefObject<HTMLElement>, onPick: (text: string) => void, onClose: () => void,
 *   unicodeOnly?: boolean, title?: string }} props
 *   unicodeOnly: hide the server's emojis, for text where custom emojis don't show (nicknames, bios...).
 */
export function EmojiPicker({ anchorRef, onPick, onClose, unicodeOnly = false, title = "Emoji" }) {
  const server = useContext(ServerEmojis);
  const serverEmojis = unicodeOnly || !server?.emojis ? NO_EMOJIS : server.emojis;
  const [groups, setGroups] = useState(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [tone, setTone] = useState(() => readStore(TONE_KEY, 0));
  const [toneOpen, setToneOpen] = useState(false);
  const [recents, setRecents] = useState(() => readStore(RECENTS_KEY, []));
  const [hovered, setHovered] = useState(null);
  const [active, setActive] = useState(null);
  const root = useRef(null);
  const scroller = useRef(null);
  const search = useRef(null);
  const pos = usePosition(anchorRef, root);

  useEffect(() => {
    loadGroups().then(setGroups, () => setFailed(true));
  }, []);

  // The picker renders once it knows where to go; focus the search box then.
  const placed = Boolean(pos);
  useEffect(() => {
    if (placed) search.current?.focus({ preventScroll: true });
  }, [placed]);

  useEffect(() => {
    const onDown = (e) => {
      if (root.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return;
      onClose();
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        anchorRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [anchorRef, onClose]);

  const sections = useMemo(() => {
    const custom = serverEmojis.map((e) => ({ key: e.id, text: customEmojiText(e), label: `:${e.name}:`, name: e.name.toLowerCase(), custom: e }));
    const standard = (groups ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      items: g.emojis.map(([text, name, toneable]) => {
        const shown = toneable ? withTone(text, tone) : text;
        return { key: text, text: shown, label: name, name: name.toLowerCase() };
      }),
    }));
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length) {
      const all = [...custom, ...standard.flatMap((s) => s.items)];
      const phrase = words.join(" ");
      // Exact names first, then names starting with the search, then words starting
      // with it ("grinning cat" for "cat"), then the rest. Server emojis win ties.
      const rank = (item) => {
        const name = item.custom ? item.name.replace(/_/g, " ") : item.name;
        if (name === phrase) return 0;
        if (name.startsWith(phrase)) return 1;
        if (name.split(/[\s_:-]+/).some((part) => part.startsWith(words[0]))) return 2;
        return 3;
      };
      const scored = all
        .filter((item) => words.every((w) => item.name.includes(w)))
        .map((item) => ({ item, rank: rank(item) }))
        .sort((a, b) => a.rank - b.rank || Number(Boolean(b.item.custom)) - Number(Boolean(a.item.custom)))
        .map((r) => r.item);
      return [{ id: "results", name: scored.length ? "Search results" : "", items: scored.slice(0, 300) }];
    }
    const known = new Map([...custom, ...standard.flatMap((s) => s.items)].map((item) => [item.custom ? item.text : item.key, item]));
    const recentItems = recents.map((text) => known.get(text)).filter(Boolean);
    return [
      ...(recentItems.length ? [{ id: "recent", name: "Recently used", icon: "🕘", items: recentItems }] : []),
      ...(custom.length ? [{ id: "server", name: server?.guildName ? `${server.guildName}` : "This server", icon: null, server: true, items: custom }] : []),
      ...standard,
    ];
  }, [groups, serverEmojis, server?.guildName, tone, query, recents]);

  function pick(item, event) {
    const nextRecents = [item.custom ? item.text : item.key, ...recents.filter((r) => r !== (item.custom ? item.text : item.key))].slice(0, MAX_RECENTS);
    writeStore(RECENTS_KEY, nextRecents);
    // Shift+click (or Shift+Enter) picks several without closing, like Discord.
    const keepOpen = Boolean(event?.shiftKey);
    onPick(item.text, { keepOpen });
    if (keepOpen) setRecents(nextRecents);
    else onClose();
  }

  // Stable handlers, so the (memoized) cells don't all re-render on every hover.
  const pickRef = useRef(pick);
  pickRef.current = pick;
  const onCellPick = useCallback((item, event) => pickRef.current(item, event), []);

  function jump(id) {
    const el = scroller.current?.querySelector(`[data-section="${id}"]`);
    if (el) scroller.current.scrollTop = el.offsetTop - 4;
    setActive(id);
  }

  function onScroll() {
    const top = scroller.current.scrollTop + 8;
    let current = null;
    for (const el of scroller.current.querySelectorAll("[data-section]")) {
      if (el.offsetTop <= top) current = el.dataset.section;
    }
    setActive(current);
  }

  // Arrow keys move around the grid, across sections too.
  function onGridKey(e) {
    const dir = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -2, ArrowDown: 2 }[e.key];
    if (!dir) return;
    const cells = [...scroller.current.querySelectorAll("[data-emoji-cell]")];
    const index = cells.indexOf(document.activeElement);
    if (index === -1) return;
    e.preventDefault();
    if (Math.abs(dir) === 1) {
      cells[index + dir]?.focus();
      return;
    }
    const down = dir > 0;
    const here = cells[index].getBoundingClientRect();
    let best = null;
    let bestScore = Infinity;
    for (const cell of cells) {
      const rect = cell.getBoundingClientRect();
      const dy = down ? rect.top - here.top : here.top - rect.top;
      if (dy <= 1) continue;
      const score = dy * 1000 + Math.abs(rect.left - here.left);
      if (score < bestScore) {
        best = cell;
        bestScore = score;
      }
    }
    if (best) best.focus();
    else if (!down) search.current?.focus();
  }

  const shownSections = sections.filter((s) => s.items.length || s.id === "results");
  const activeId = active ?? shownSections[0]?.id;
  const preview = hovered ?? shownSections.find((s) => s.items.length)?.items[0] ?? null;

  if (!pos) return null;
  const style = pos.sheet ? undefined : { left: pos.left, top: pos.top, width: WIDTH, height: HEIGHT };

  return createPortal(
    <>
      {pos.sheet && <div className="ep-backdrop" aria-hidden="true" />}
      <div ref={root} className={`emoji-picker${pos.sheet ? " sheet" : ""}`} style={style} role="dialog" aria-label={`${title} picker`}>
        <div className="ep-head">
          <label className="visually-hidden" htmlFor="ep-search">Search emojis</label>
          <input
            id="ep-search"
            ref={search}
            className="ep-search"
            type="search"
            autoComplete="off"
            placeholder="Find the perfect emoji"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (scroller.current) scroller.current.scrollTop = 0;
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                scroller.current?.querySelector("[data-emoji-cell]")?.focus();
              }
              else if (e.key === "Enter") {
                e.preventDefault();
                const first = shownSections.find((s) => s.items.length)?.items[0];
                if (first) pick(first, e);
              }
            }}
          />
          <div className="ep-tone">
            <button type="button" className="ep-tone-button" aria-label="Skin tone" aria-expanded={toneOpen} onClick={() => setToneOpen((o) => !o)}>
              {TONE_SAMPLE[tone]}
            </button>
            {toneOpen && (
              <div className="ep-tone-menu" role="menu">
                {TONE_SAMPLE.map((sample, i) => (
                  <button
                    key={sample}
                    type="button"
                    role="menuitemradio"
                    aria-checked={tone === i}
                    aria-label={["Default", "Light", "Medium-light", "Medium", "Medium-dark", "Dark"][i]}
                    onClick={() => {
                      setTone(i);
                      writeStore(TONE_KEY, i);
                      setToneOpen(false);
                    }}
                  >
                    {sample}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="ep-close" aria-label="Close emoji picker" onClick={onClose}>✕</button>
        </div>

        {!query && (
          <nav className="ep-nav" aria-label="Emoji categories">
            {sections.filter((s) => s.items.length).map((s) => (
              <button key={s.id} type="button" className={activeId === s.id ? "on" : undefined} aria-label={s.name} title={s.name} onClick={() => jump(s.id)}>
                {s.server ? <ServerIcon emojis={s.items} /> : s.icon}
              </button>
            ))}
          </nav>
        )}

        <div className="ep-scroll" ref={scroller} onScroll={onScroll} onKeyDown={onGridKey}>
          {failed && <p className="ep-empty">Couldn't load emojis. Check your connection and try again.</p>}
          {!groups && !failed && <p className="ep-empty">Loading emojis…</p>}
          {shownSections.map((s) => (
            <section key={s.id} data-section={s.id} className="ep-section">
              {s.name && <h4>{s.name}{s.server && server?.hidden ? <span title="Locked to roles Phoenix doesn't have, or unavailable on this server's boost level"> · {server.hidden} hidden</span> : null}</h4>}
              {s.items.length === 0 && s.id === "results" && <p className="ep-empty">No emojis match “{query.trim()}”.</p>}
              <div className="ep-grid">
                {s.items.map((item) => <Cell key={`${s.id}-${item.key}`} item={item} onPick={onCellPick} onHover={setHovered} />)}
              </div>
            </section>
          ))}
        </div>

        <div className="ep-foot" aria-live="polite">
          {preview && (
            <>
              <span className="ep-foot-emoji">
                {preview.custom ? <img src={customEmojiUrl(preview.custom.id, preview.custom.animated, 64)} alt="" width={30} height={30} /> : preview.text}
              </span>
              <span className="ep-foot-name">{preview.custom ? `:${preview.custom.name}:` : preview.label}</span>
              {preview.custom && <span className="ep-foot-tag">{server?.guildName ?? "Server"}</span>}
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

function ServerIcon({ emojis }) {
  const first = emojis[0]?.custom;
  return first ? <img src={customEmojiUrl(first.id, false, 32)} alt="" width={20} height={20} /> : "⭐";
}
