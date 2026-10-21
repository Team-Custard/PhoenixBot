import { useState } from "react";
import { EmojiField } from "../components/emoji/EmojiField.jsx";
import { api } from "../api.js";
import { useToast } from "../components/Toasts.jsx";
import { EmbedSelect } from "../components/fields.jsx";
import { MessagePreview } from "../components/Preview.jsx";

function TagForm({ data, me, initial, onSubmit, onCancel, submitLabel }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [text, setText] = useState(initial?.description ?? "");
  const [embed, setEmbed] = useState(initial?.embed ?? null);
  const [busy, setBusy] = useState(false);
  const editing = Boolean(initial);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit({ name, description: text, embed });
      if (!editing) {
        setName("");
        setText("");
        setEmbed(null);
      }
    }
    catch {
      // The error was already shown; keep what they typed.
    }
    finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="tag-form">
      <div className="row" style={{ marginBottom: 10 }}>
        {!editing && (
          <div style={{ flex: "0 1 200px" }}>
            <label htmlFor="tag-name">Name</label>
            <input id="tag-name" className="input" maxLength={12} value={name} onChange={(e) => setName(e.target.value.replace(/\s/g, ""))} />
          </div>
        )}
        <div style={{ flex: "0 1 240px" }}>
          <label htmlFor={`tag-embed-${initial?.name ?? "new"}`}>Embed</label>
          <EmbedSelect id={`tag-embed-${initial?.name ?? "new"}`} value={embed} onChange={setEmbed} data={data} />
        </div>
      </div>
      <label htmlFor={`tag-text-${initial?.name ?? "new"}`}>Text</label>
      <EmojiField as="textarea" id={`tag-text-${initial?.name ?? "new"}`} className="textarea" maxLength={2048} value={text} onChange={setText} />
      <MessagePreview text={text} embed={embed} data={data} me={me} />
      <div className="inline" style={{ marginTop: 10 }}>
        <button type="submit" className="button primary" disabled={(!editing && !name) || (!text.trim() && !embed) || busy}>{busy ? "Saving..." : submitLabel}</button>
        {onCancel && <button type="button" className="button quiet" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

export function TagsManager({ data, me, onChange }) {
  const toast = useToast();
  const [editing, setEditing] = useState(null);

  async function add({ name, description, embed }) {
    try {
      const result = await api.post(`/guilds/${data.guild.id}/tags`, { name, description, embed });
      onChange(result.tags);
      toast(`Added tag ${name}.`);
    }
    catch (err) {
      toast(err.message, "error");
      throw err;
    }
  }

  async function save(tagName, { description, embed }) {
    try {
      const result = await api.put(`/guilds/${data.guild.id}/tags/${encodeURIComponent(tagName)}`, { description, embed });
      onChange(result.tags);
      setEditing(null);
      toast(`Saved tag ${tagName}.`);
    }
    catch (err) {
      toast(err.message, "error");
    }
  }

  async function remove(tagName) {
    if (!window.confirm(`Delete the tag "${tagName}"?`)) return;
    try {
      const result = await api.delete(`/guilds/${data.guild.id}/tags/${encodeURIComponent(tagName)}`);
      onChange(result.tags);
      toast(`Deleted tag ${tagName}.`);
    }
    catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <>
      <section className="panel">
        <h3>Add a tag</h3>
        <p>{data.tags.length} of {data.limits.tags} tags used. Use the Placeholders button above for things like the member's name or the date. Embeds are made on the Embeds page.</p>
        <TagForm data={data} me={me} onSubmit={add} submitLabel="Add tag" />
      </section>

      <section className="panel">
        <h3>Server tags</h3>
        {data.tags.length === 0 ? <p>No tags yet.</p> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Name</th><th>Content</th><th>Made by</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
              <tbody>
                {data.tags.map((tag) => (
                  <tr key={tag.name}>
                    <td className="punishment">{tag.name}</td>
                    <td>
                      {editing === tag.name ? (
                        <TagForm data={data} me={me} initial={tag} onSubmit={(values) => save(tag.name, values)} onCancel={() => setEditing(null)} submitLabel="Save tag" />
                      ) : (
                        <>
                          {tag.description && <div className="tag-text">{tag.description}</div>}
                          {tag.embed && <div className="field-help">Embed: {tag.embed}{!data.embeds.some((e) => e.name === tag.embed) ? " (deleted)" : ""}</div>}
                        </>
                      )}
                    </td>
                    <td className="num">{tag.creator}</td>
                    <td>
                      {editing !== tag.name && (
                        <div className="inline">
                          <button type="button" className="button small" onClick={() => setEditing(tag.name)}>Edit</button>
                          <button type="button" className="icon-button" aria-label={`Delete ${tag.name}`} onClick={() => remove(tag.name)}>✕</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
