import { useMemo, useState } from "react";
import { useJson, useTitle } from "../publicApi.js";
import { Icon } from "../icons.jsx";

function argText(arg) {
  return arg.required ? `<${arg.name}>` : `[${arg.name}]`;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="copy"
      aria-label={`Copy ${text}`}
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      <Icon name={copied ? "check" : "copy"} size={15} />
    </button>
  );
}

function Args({ args }) {
  if (!args?.length) return null;
  return (
    <dl className="cmd-args">
      {args.map((arg) => (
        <div key={arg.name}>
          <dt><code>{arg.name}</code>{arg.required ? <span className="req">required</span> : null}</dt>
          <dd>{arg.description}{arg.choices?.length ? <span className="choices"> One of: {arg.choices.join(", ")}</span> : null}</dd>
        </div>
      ))}
    </dl>
  );
}

function CommandCard({ command }) {
  const subs = command.subcommands ?? [];
  const usage = command.slash ?? command.usage;
  return (
    <article className="cmd-card" id={`cmd-${command.name}`}>
      <header>
        <h3>{command.slash ? command.slash : command.name}</h3>
        <div className="cmd-badges">
          {command.prefixOnly && <span className="badge">Prefix only</span>}
          {command.contextMenus?.map((m) => <span key={m.name} className="badge app">Apps → {m.name}</span>)}
          {command.permissions?.length > 0 && <span className="badge perm" title="Who can use it by default">{command.permissions.join(" or ")}</span>}
        </div>
      </header>
      <p>{command.description}</p>
      {!subs.length && (
        <div className="cmd-usage">
          <code>{command.slash ? `${command.slash} ${command.args.map(argText).join(" ")}`.trim() : command.usage}</code>
          <CopyButton text={usage} />
        </div>
      )}
      {!subs.length && <Args args={command.args} />}
      {subs.length > 0 && (
        <ul className="cmd-subs">
          {subs.map((sub) => (
            <li key={sub.name}>
              <div className="cmd-usage">
                <code>{sub.slash ? `${sub.slash} ${sub.args.map(argText).join(" ")}`.trim() : sub.usage}</code>
                <CopyButton text={sub.slash ?? sub.usage} />
              </div>
              <p>{sub.description}</p>
              <Args args={sub.args} />
            </li>
          ))}
        </ul>
      )}
      {command.aliases?.length > 0 && <p className="cmd-aliases">Prefix aliases: {command.aliases.join(", ")}</p>}
    </article>
  );
}

export function Commands() {
  useTitle("Commands");
  const { data, error, loading } = useJson("/api/public/commands");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const shown = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase().replace(/^\//, "");
    return data.commands.filter((c) => {
      if (category !== "all" && c.category !== category) return false;
      if (!q) return true;
      const haystack = [c.name, c.slash, c.description, ...(c.aliases ?? []), ...(c.subcommands ?? []).flatMap((s) => [s.name, s.description, s.slash])]
        .filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [data, query, category]);

  return (
    <main className="page">
      <header className="page-head">
        <p className="eyebrow">Commands</p>
        <h1>Everything Phoenix can do</h1>
        <p className="lede">
          Every command works as a slash command. Most also work with the server's prefix (= by default),
          but prefix commands are on their way out, so slash is the way to go.
        </p>
      </header>

      <div className="cmd-tools">
        <label className="search">
          <Icon name="search" size={18} />
          <span className="visually-hidden">Search commands</span>
          <input type="search" placeholder="Search commands" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        {data?.categories?.length > 1 && (
          <div className="pills" role="group" aria-label="Category">
            <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")}>All</button>
            {data.categories.map((c) => (
              <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>{c.name}</button>
            ))}
          </div>
        )}
      </div>

      {loading && <div className="loading" aria-label="Loading commands"><span /><span /><span /></div>}
      {error && <div className="callout error">Couldn't load the command list: {error.message}</div>}
      {data && data.commands.length === 0 && (
        <div className="callout">The command list shows up here once the bot has started. Try again in a minute.</div>
      )}
      {data && data.commands.length > 0 && shown.length === 0 && <div className="callout">No commands match “{query}”.</div>}
      <div className="cmd-grid">
        {shown.map((command) => <CommandCard key={`${command.category}-${command.name}`} command={command} />)}
      </div>
    </main>
  );
}
