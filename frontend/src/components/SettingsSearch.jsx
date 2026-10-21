// The search bar at the top of a server's dashboard: finds settings by name or
// description and jumps straight to them.
import { useEffect, useMemo, useRef, useState } from "react";

// Words people might search for on pages that aren't plain settings forms.
const PAGE_KEYWORDS = {
  cases: "warnings mutes kicks bans pardon reasons infractions history",
  profile: "nickname avatar banner bio about me name picture",
  embeds: "embed builder send save load message",
  levels: "xp rank reset leaderboard set level delete",
  rolemenus: "self roles dropdown reaction roles menu",
  leveling: "rank card background image xp rate",
  verification: "verify panel button captcha",
  automod: "honeypot trap spam filters",
  tags: "custom commands replies",
  plus: "premium subscription limits upgrade",
  audit: "history changes who changed log",
  afk: "away status welcome back",
};

function buildIndex(pages) {
  const entries = [];
  for (const page of pages) {
    entries.push({ id: `page:${page.id}`, page, title: page.name, detail: page.description, text: `${page.name} ${page.description ?? ""} ${PAGE_KEYWORDS[page.id] ?? ""}` });
    const section = page.section;
    if (!section) continue;
    const seenGroups = new Set();
    for (const field of section.fields) {
      if (field.group && !seenGroups.has(field.group)) {
        seenGroups.add(field.group);
        const meta = section.groups?.[field.group];
        if (meta) entries.push({ id: `group:${page.id}:${field.group}`, page, key: `group:${field.group}`, title: meta.label, detail: meta.help, text: `${meta.label} ${meta.help ?? ""}` });
      }
      const groupLabel = field.group ? section.groups?.[field.group]?.label : null;
      const title = field.groupToggle ? `${groupLabel} (on or off)` : groupLabel && !field.label.includes(groupLabel) ? `${groupLabel}: ${field.label}` : field.label;
      const subLabels = (field.fields ?? []).map((f) => f.label).join(" ");
      entries.push({ id: `field:${field.key}`, page, key: field.key, title, detail: field.help, text: `${title} ${field.help ?? ""} ${subLabels}` });
    }
  }
  return entries;
}

function score(entry, words) {
  const title = entry.title.toLowerCase();
  const text = entry.text.toLowerCase();
  if (!words.every((w) => text.includes(w))) return 0;
  let s = 1;
  for (const w of words) {
    if (title.startsWith(w)) s += 4;
    else if (title.includes(w)) s += 2;
  }
  if (entry.id.startsWith("page:")) s += 1;
  return s;
}

export function SettingsSearch({ pages, onPick }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef(null);
  const index = useMemo(() => buildIndex(pages), [pages]);

  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return index
      .map((entry) => ({ entry, s: score(entry, words) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map((r) => r.entry);
  }, [index, query]);

  // "/" or Ctrl+K jumps to the search bar.
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? "") || document.activeElement?.isContentEditable;
      if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function pick(entry) {
    setQuery("");
    setOpen(false);
    input.current?.blur();
    onPick(entry.page.id, entry.key ?? null);
  }

  return (
    <div className="settings-search" role="search">
      <label className="visually-hidden" htmlFor="settings-search">Search settings</label>
      <span className="settings-search-icon" aria-hidden="true">⌕</span>
      <input
        ref={input}
        id="settings-search"
        type="search"
        autoComplete="off"
        placeholder="Search settings, like “welcome message” or “mute role”"
        value={query}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="settings-search-results"
        aria-activedescendant={open && results[active] ? `search-${results[active].id}` : undefined}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          }
          else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          }
          else if (e.key === "Enter" && results[active]) {
            e.preventDefault();
            pick(results[active]);
          }
          else if (e.key === "Escape") {
            setQuery("");
            setOpen(false);
          }
        }}
      />
      <kbd className="settings-search-kbd" aria-hidden="true">/</kbd>
      {open && query.trim() && (
        <ul id="settings-search-results" className="settings-search-results" role="listbox">
          {results.length === 0 && <li className="settings-search-empty">No settings match “{query.trim()}”.</li>}
          {results.map((entry, i) => (
            <li
              key={entry.id}
              id={`search-${entry.id}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? "active" : undefined}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(entry);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="settings-search-title">{entry.title}</span>
              <span className="settings-search-page">{entry.id.startsWith("page:") ? "Page" : entry.page.name}</span>
              {entry.detail && <span className="settings-search-detail">{entry.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
