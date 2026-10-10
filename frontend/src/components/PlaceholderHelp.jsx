import { useEffect, useRef, useState } from "react";

/** A button that shows every placeholder; click one to copy it. */
export function PlaceholderHelp({ data, only }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(null);
  const dialog = useRef(null);
  const list = (data.placeholders ?? []).filter((p) => !p.only || (only && p.only.includes(only)));
  const groups = [...new Set(list.map((p) => p.group))];

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  function copy(name) {
    // The clipboard only works on https (or localhost), and people can block it.
    if (!navigator.clipboard) return setCopied(`${name}:no`);
    navigator.clipboard.writeText(`{{${name}}}`).then(
      () => setCopied(name),
      () => setCopied(`${name}:no`),
    );
    setTimeout(() => setCopied((c) => (c?.startsWith(name) ? null : c)), 2000);
  }

  return (
    <>
      <button type="button" className="button small placeholder-button" onClick={() => setOpen(true)}>
        <span aria-hidden="true">{"{ }"}</span> Placeholders
      </button>
      <dialog ref={dialog} className="placeholder-dialog" onClose={() => setOpen(false)} onClick={(e) => e.target === dialog.current && setOpen(false)}>
        <header>
          <h2>Placeholders</h2>
          <button type="button" className="icon-button" aria-label="Close" onClick={() => setOpen(false)}>✕</button>
        </header>
        <p>Type these into messages, tags and embeds and Phoenix fills them in when it sends them. Click one to copy it. Image placeholders also work in an embed's image, thumbnail and icon boxes.</p>
        {groups.map((group) => (
          <section key={group}>
            <h3>{group}</h3>
            <ul>
              {list.filter((p) => p.group === group).map((p) => (
                <li key={p.name}>
                  <button type="button" onClick={() => copy(p.name)} aria-label={`Copy {{${p.name}}}`}>
                    <code>{`{{${p.name}}}`}</code>
                    <span>{p.description}{p.image ? " (image)" : ""}</span>
                    <em aria-live="polite">{copied === p.name ? "Copied" : copied === `${p.name}:no` ? "Copy it by hand" : ""}</em>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="field-help">Member placeholders are empty in timed and sticky messages, since those aren't about anyone.</p>
      </dialog>
    </>
  );
}
