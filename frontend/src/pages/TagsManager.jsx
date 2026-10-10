import { useState } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toasts.jsx";

export function TagsManager({ data, onChange }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api.post(`/guilds/${data.guild.id}/tags`, { name, description: text });
      onChange(result.tags);
      setName("");
      setText("");
      toast(`Added tag ${name}.`);
    }
    catch (err) {
      toast(err.message, "error");
    }
    finally {
      setBusy(false);
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
        <p>{data.tags.length} of {data.limits.tags} tags used. Placeholders like {"{{mention}}"} work in tag text.</p>
        <form onSubmit={add}>
          <div className="row" style={{ marginBottom: 10 }}>
            <div style={{ flex: "0 1 200px" }}>
              <label htmlFor="tag-name">Name</label>
              <input id="tag-name" className="input" maxLength={12} value={name} onChange={(e) => setName(e.target.value.replace(/\s/g, ""))} />
            </div>
          </div>
          <label htmlFor="tag-text">Text</label>
          <textarea id="tag-text" className="textarea" maxLength={2048} value={text} onChange={(e) => setText(e.target.value)} />
          <div style={{ marginTop: 10 }}>
            <button type="submit" className="button primary" disabled={!name || !text || busy}>{busy ? "Adding..." : "Add tag"}</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h3>Server tags</h3>
        {data.tags.length === 0 ? <p>No tags yet.</p> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Name</th><th>Text</th><th>Made by</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
              <tbody>
                {data.tags.map((tag) => (
                  <tr key={tag.name}>
                    <td className="punishment">{tag.name}</td>
                    <td><div className="tag-text">{tag.description}</div></td>
                    <td className="num">{tag.creator}</td>
                    <td><button type="button" className="icon-button" aria-label={`Delete ${tag.name}`} onClick={() => remove(tag.name)}>✕</button></td>
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
