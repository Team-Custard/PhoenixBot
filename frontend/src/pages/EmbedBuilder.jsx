import { useMemo, useState } from "react";
import { api } from "../api.js";
import { ChannelSelect } from "../components/fields.jsx";
import { EmojiField } from "../components/emoji/EmojiField.jsx";
import { useToast } from "../components/Toasts.jsx";
import { useUnsavedWarning } from "../components/SectionForm.jsx";
import { Markdown } from "../components/Markdown.jsx";
import { PlaceholderHelp } from "../components/PlaceholderHelp.jsx";
import { HAS_PLACEHOLDER, fillUrl, sampleValues } from "../placeholders.js";

const ORANGE = 0xff8a3d;
const LIMITS = { title: 256, description: 4096, fields: 25, fieldName: 256, fieldValue: 1024, footer: 2048, author: 256, total: 6000, name: 15 };

const blank = () => ({
  color: null,
  author: { name: "", icon_url: "", url: "" },
  title: "",
  url: "",
  description: "",
  thumbnail: "",
  image: "",
  fields: [],
  footer: { text: "", icon_url: "" },
  timestamp: null,
});

/** Stored data (with nulls) → editor state (with empty strings). */
export function toEditor(data) {
  const base = blank();
  if (!data) return base;
  return {
    ...base,
    color: data.color ?? null,
    author: { name: data.author?.name ?? "", icon_url: data.author?.icon_url ?? "", url: data.author?.url ?? "" },
    title: data.title ?? "",
    url: data.url ?? "",
    description: data.description ?? "",
    thumbnail: data.thumbnail ?? "",
    image: data.image ?? "",
    fields: (data.fields ?? []).map((f) => ({ name: f.name ?? "", value: f.value ?? "", inline: Boolean(f.inline) })),
    footer: { text: data.footer?.text ?? "", icon_url: data.footer?.icon_url ?? "" },
    timestamp: data.timestamp ?? null,
  };
}

const hex = (color) => `#${(color ?? ORANGE).toString(16).padStart(6, "0")}`;

function totalLength(e) {
  return [e.title, e.description, e.author.name, e.footer.text, ...e.fields.flatMap((f) => [f.name, f.value])]
    .reduce((sum, part) => sum + (part?.trim().length ?? 0), 0);
}

function isEmpty(e) {
  return !(e.title.trim() || e.description.trim() || e.author.name.trim() || e.footer.text.trim() || e.image.trim() || e.thumbnail.trim() || e.fields.length);
}

function toLocalInput(ms) {
  if (!ms) return "";
  const date = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function Count({ value, max }) {
  const length = value?.length ?? 0;
  if (length < max * 0.8) return null;
  return <span className={`char-count${length > max ? " over" : ""}`}>{length} / {max}</span>;
}

// emoji: "all" adds the emoji button, "unicode" one without server emojis (they don't
// show in embed author names and footers).
function Input({ id, label, value, onChange, max, placeholder, type = "text", emoji = null }) {
  return (
    <div className="eb-input">
      <label htmlFor={id}>{label}</label>
      {emoji ? (
        <EmojiField id={id} className="input" type={type} value={value} maxLength={max ? max + 200 : undefined} placeholder={placeholder} onChange={onChange} unicodeOnly={emoji === "unicode"} />
      ) : (
        <input id={id} className="input" type={type} value={value} maxLength={max ? max + 200 : undefined} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {max && <Count value={value} max={max} />}
    </div>
  );
}

function Group({ title, children, open = false }) {
  return (
    <details className="eb-group" open={open}>
      <summary>{title}</summary>
      <div className="eb-group-body">{children}</div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Preview, drawn like Discord's own embeds
// ---------------------------------------------------------------------------

export function EmbedPreview({ embed: raw, data, content, me, extra = {} }) {
  const values = sampleValues(data, me, extra);
  const ctx = {
    channels: data.channels,
    roles: data.roles,
    values,
    userName: (id) => (id === me?.id ? me.globalName || me.username : "user"),
  };
  // Image boxes with placeholders ({{avatar}}, {{servericon}}...) show the real image.
  const img = (value) => (value && HAS_PLACEHOLDER.test(value) ? fillUrl(value, values) : value);
  const embed = {
    ...raw,
    url: img(raw.url),
    thumbnail: img(raw.thumbnail),
    image: img(raw.image),
    author: { ...raw.author, icon_url: img(raw.author.icon_url), url: img(raw.author.url) },
    footer: { ...raw.footer, icon_url: img(raw.footer.icon_url) },
  };
  const fields = embed.fields.filter((f) => f.name.trim() || f.value.trim());
  // Discord puts up to three inline fields on a row.
  const rows = [];
  for (const field of fields) {
    const last = rows[rows.length - 1];
    if (field.inline && last?.inline && last.items.length < 3) last.items.push(field);
    else rows.push({ inline: field.inline, items: [field] });
  }
  const profile = data.bot.profile;
  const empty = isEmpty(raw);

  return (
    <div className="discord-preview">
      <div className="discord-message">
        <img src={profile.avatar ?? profile.userAvatar} alt="" width={40} height={40} />
        <div className="discord-body">
          <div className="discord-author">{profile.nick || profile.username} <span className="app-tag">APP</span> <span className="discord-time">Today at {new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span></div>
          {content && <div className="discord-content"><Markdown text={content} ctx={ctx} /></div>}
          {empty ? (
            <div className="eb-empty">Your embed will appear here as you build it.</div>
          ) : (
            <div className={`discord-embed${embed.thumbnail ? " has-thumb" : ""}`} style={{ borderColor: hex(embed.color) }}>
              <div className="discord-embed-grid">
                {embed.author.name && (
                  <div className="discord-embed-author">
                    {embed.author.icon_url && <img src={embed.author.icon_url} alt="" width={24} height={24} />}
                    {embed.author.url ? <a href={embed.author.url} target="_blank" rel="noreferrer"><Markdown text={embed.author.name} ctx={ctx} blocks={false} /></a> : <span><Markdown text={embed.author.name} ctx={ctx} blocks={false} /></span>}
                  </div>
                )}
                {embed.title && (
                  <div className="discord-embed-title">
                    {embed.url ? <a href={embed.url} target="_blank" rel="noreferrer"><Markdown text={embed.title} ctx={ctx} blocks={false} /></a> : <Markdown text={embed.title} ctx={ctx} blocks={false} />}
                  </div>
                )}
                {embed.description && <div className="discord-embed-description"><Markdown text={embed.description} ctx={ctx} /></div>}
                {rows.length > 0 && (
                  <div className="discord-embed-fields">
                    {rows.map((row, i) => (
                      <div key={i} className="discord-embed-row" style={{ gridTemplateColumns: `repeat(${row.items.length}, minmax(0, 1fr))` }}>
                        {row.items.map((f, j) => (
                          <div key={j} className="discord-embed-field">
                            <div className="discord-embed-field-name"><Markdown text={f.name} ctx={ctx} blocks={false} /></div>
                            <div className="discord-embed-field-value"><Markdown text={f.value} ctx={ctx} /></div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {embed.image && <img className="discord-embed-image" src={embed.image} alt="" />}
                {embed.thumbnail && <img className="discord-embed-thumb" src={embed.thumbnail} alt="" width={80} height={80} />}
                {(embed.footer.text || embed.timestamp) && (
                  <div className="discord-embed-footer">
                    {embed.footer.icon_url && embed.footer.text && <img src={embed.footer.icon_url} alt="" width={20} height={20} />}
                    <span>
                      <Markdown text={embed.footer.text} ctx={ctx} blocks={false} />
                      {embed.footer.text && embed.timestamp ? " • " : ""}
                      {embed.timestamp ? new Date(embed.timestamp).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The builder
// ---------------------------------------------------------------------------

export function EmbedBuilder({ data, me, onSaved }) {
  const toast = useToast();
  const [embed, setEmbed] = useState(blank);
  const [name, setName] = useState("");
  const [loadedName, setLoadedName] = useState(null);
  const [savedJson, setSavedJson] = useState(JSON.stringify(blank()));
  const [channelId, setChannelId] = useState(null);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(null);

  const dirty = JSON.stringify(embed) !== savedJson;
  useUnsavedWarning(dirty);
  const total = useMemo(() => totalLength(embed), [embed]);
  const set = (patch) => setEmbed((e) => ({ ...e, ...patch }));
  const setNested = (key, patch) => setEmbed((e) => ({ ...e, [key]: { ...e[key], ...patch } }));
  const setField = (index, patch) => setEmbed((e) => ({ ...e, fields: e.fields.map((f, i) => (i === index ? { ...f, ...patch } : f)) }));
  const moveField = (index, by) => setEmbed((e) => {
    const fields = [...e.fields];
    const [field] = fields.splice(index, 1);
    fields.splice(index + by, 0, field);
    return { ...e, fields };
  });

  function confirmDiscard() {
    return !dirty || window.confirm("You have unsaved changes to this embed. Discard them?");
  }

  function load(entryName) {
    if (!entryName || !confirmDiscard()) return;
    const entry = data.embeds.find((e) => e.name === entryName);
    if (!entry) return;
    const next = toEditor(entry.data);
    setEmbed(next);
    setSavedJson(JSON.stringify(next));
    setName(entry.name);
    setLoadedName(entry.name);
  }

  function startNew() {
    if (!confirmDiscard()) return;
    const next = blank();
    setEmbed(next);
    setSavedJson(JSON.stringify(next));
    setName("");
    setLoadedName(null);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return toast("Give the embed a name to save it.", "error");
    const exists = data.embeds.some((e) => e.name === trimmed);
    if (exists && trimmed !== loadedName && !window.confirm(`An embed called ${trimmed} already exists. Replace it?`)) return;
    setBusy("save");
    try {
      const result = await api.put(`/guilds/${data.guild.id}/embeds/${encodeURIComponent(trimmed)}`, { data: embed });
      onSaved(result.embeds);
      setSavedJson(JSON.stringify(embed));
      setLoadedName(trimmed);
      toast(`Saved ${trimmed}. It also shows up under Load Embed in /embed.`);
    }
    catch (err) {
      toast(err.message, "error");
    }
    finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!loadedName || !window.confirm(`Delete the saved embed ${loadedName}?`)) return;
    setBusy("delete");
    try {
      const result = await api.delete(`/guilds/${data.guild.id}/embeds/${encodeURIComponent(loadedName)}`);
      onSaved(result.embeds);
      toast(`Deleted ${loadedName}.`);
      setLoadedName(null);
      setSavedJson("");
    }
    catch (err) {
      toast(err.message, "error");
    }
    finally {
      setBusy(null);
    }
  }

  async function send() {
    setBusy("send");
    try {
      await api.post(`/guilds/${data.guild.id}/embeds/send`, { channelId, content, data: embed });
      const channel = data.channels.find((c) => c.id === channelId);
      toast(`Sent to #${channel?.name ?? "channel"}.`);
    }
    catch (err) {
      toast(err.message, "error");
    }
    finally {
      setBusy(null);
    }
  }

  const empty = isEmpty(embed);
  const overLimit = total > LIMITS.total;

  return (
    <div className="embed-builder">
      <div className="eb-toolbar">
        <div className="eb-input">
          <label htmlFor="eb-load">Saved embeds ({data.embeds.length} / {data.limits.embeds})</label>
          <select id="eb-load" className="select" value={loadedName ?? ""} onChange={(e) => load(e.target.value)}>
            <option value="">{data.embeds.length ? "Load a saved embed..." : "No saved embeds yet"}</option>
            {data.embeds.map((e) => <option key={e.name} value={e.name}>{e.name}</option>)}
          </select>
        </div>
        <div className="eb-input">
          <label htmlFor="eb-name">Name</label>
          <input id="eb-name" className="input" maxLength={LIMITS.name} placeholder="e.g. rules" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="inline eb-actions">
          <PlaceholderHelp data={data} />
          <button type="button" className="button primary" disabled={busy !== null || empty || overLimit} onClick={save}>{busy === "save" ? "Saving..." : "Save"}</button>
          <button type="button" className="button" onClick={startNew}>New</button>
          {loadedName && <button type="button" className="button danger" disabled={busy !== null} onClick={remove}>Delete</button>}
        </div>
      </div>
      {dirty && !empty && <p className="field-help eb-dirty">Unsaved changes</p>}

      <div className="eb-columns">
        <div className="eb-editor">
          <Group title="Basics" open>
            <div className="eb-color">
              <label htmlFor="eb-color">Color</label>
              <div className="inline">
                <input id="eb-color" type="color" value={hex(embed.color)} onChange={(e) => set({ color: Number.parseInt(e.target.value.slice(1), 16) })} />
                <input
                  className="input"
                  aria-label="Color hex code"
                  value={hex(embed.color)}
                  onChange={(e) => {
                    const match = /^#?([0-9a-f]{6})$/i.exec(e.target.value.trim());
                    if (match) set({ color: Number.parseInt(match[1], 16) });
                  }}
                />
                {embed.color !== null && <button type="button" className="button quiet small" onClick={() => set({ color: null })}>Phoenix orange</button>}
              </div>
            </div>
            <Input id="eb-title" label="Title" value={embed.title} max={LIMITS.title} emoji="all" onChange={(title) => set({ title })} />
            <Input id="eb-url" label="Title link" type="text" placeholder="https:// or a placeholder like {{avatar}}" value={embed.url} onChange={(url) => set({ url })} />
            <div className="eb-input">
              <label htmlFor="eb-description">Description</label>
              <EmojiField as="textarea" id="eb-description" className="textarea" rows={6} value={embed.description} onChange={(description) => set({ description })} placeholder="Supports **bold**, *italics*, [links](https://...), lists, quotes and more." />
              <Count value={embed.description} max={LIMITS.description} />
            </div>
          </Group>

          <Group title="Author">
            <Input id="eb-author" label="Name" value={embed.author.name} max={LIMITS.author} emoji="unicode" onChange={(v) => setNested("author", { name: v })} />
            <Input id="eb-author-icon" label="Icon link" type="text" placeholder="https:// or a placeholder like {{avatar}}" value={embed.author.icon_url} onChange={(v) => setNested("author", { icon_url: v })} />
            <Input id="eb-author-url" label="Link" type="text" placeholder="https:// or a placeholder like {{avatar}}" value={embed.author.url} onChange={(v) => setNested("author", { url: v })} />
          </Group>

          <Group title="Images">
            <Input id="eb-thumb" label="Thumbnail (small, top right)" type="text" placeholder="https:// or a placeholder like {{avatar}}" value={embed.thumbnail} onChange={(thumbnail) => set({ thumbnail })} />
            <Input id="eb-image" label="Image (large, at the bottom)" type="text" placeholder="https:// or a placeholder like {{avatar}}" value={embed.image} onChange={(image) => set({ image })} />
          </Group>

          <Group title={`Fields (${embed.fields.length} / ${LIMITS.fields})`} open={embed.fields.length > 0}>
            {embed.fields.map((field, index) => (
              <div className="eb-field" key={index}>
                <div className="eb-field-head">
                  <strong>Field {index + 1}</strong>
                  <div className="inline">
                    <button type="button" className="icon-button" aria-label={`Move field ${index + 1} up`} disabled={index === 0} onClick={() => moveField(index, -1)}>↑</button>
                    <button type="button" className="icon-button" aria-label={`Move field ${index + 1} down`} disabled={index === embed.fields.length - 1} onClick={() => moveField(index, 1)}>↓</button>
                    <button type="button" className="icon-button" aria-label={`Remove field ${index + 1}`} onClick={() => set({ fields: embed.fields.filter((_, i) => i !== index) })}>✕</button>
                  </div>
                </div>
                <Input id={`eb-field-name-${index}`} label="Name" value={field.name} max={LIMITS.fieldName} emoji="all" onChange={(v) => setField(index, { name: v })} />
                <div className="eb-input">
                  <label htmlFor={`eb-field-value-${index}`}>Text</label>
                  <EmojiField as="textarea" id={`eb-field-value-${index}`} className="textarea" rows={3} value={field.value} onChange={(value) => setField(index, { value })} />
                  <Count value={field.value} max={LIMITS.fieldValue} />
                </div>
                <label className="eb-check">
                  <input type="checkbox" checked={field.inline} onChange={(e) => setField(index, { inline: e.target.checked })} />
                  Show next to other inline fields
                </label>
              </div>
            ))}
            <button
              type="button"
              className="button"
              disabled={embed.fields.length >= LIMITS.fields}
              onClick={() => set({ fields: [...embed.fields, { name: "", value: "", inline: false }] })}
            >
              Add field
            </button>
          </Group>

          <Group title="Footer">
            <Input id="eb-footer" label="Text" value={embed.footer.text} max={LIMITS.footer} emoji="unicode" onChange={(v) => setNested("footer", { text: v })} />
            <Input id="eb-footer-icon" label="Icon link" type="text" placeholder="https:// or a placeholder like {{avatar}}" value={embed.footer.icon_url} onChange={(v) => setNested("footer", { icon_url: v })} />
            <div className="eb-input">
              <label htmlFor="eb-time">Timestamp</label>
              <div className="inline">
                <input id="eb-time" className="input" type="datetime-local" value={toLocalInput(embed.timestamp)} onChange={(e) => set({ timestamp: e.target.value ? new Date(e.target.value).getTime() : null })} />
                <button type="button" className="button small" onClick={() => set({ timestamp: Date.now() })}>Now</button>
                {embed.timestamp && <button type="button" className="button quiet small" onClick={() => set({ timestamp: null })}>Clear</button>}
              </div>
            </div>
          </Group>

          <p className={`field-help${overLimit ? " field-error" : ""}`}>{total} / {LIMITS.total} characters in total</p>
        </div>

        <div className="eb-side">
          <div className="eb-sticky">
            <div className="preview-label">Preview</div>
            <EmbedPreview embed={embed} data={data} content={content} me={me} />

            <section className="panel eb-send">
              <h3>Send it</h3>
              <div className="eb-input">
                <label htmlFor="eb-channel">Channel</label>
                <ChannelSelect id="eb-channel" field={{ channelTypes: [0, 5], required: true }} value={channelId} onChange={setChannelId} data={data} />
              </div>
              <div className="eb-input">
                <label htmlFor="eb-content">Message above the embed (optional)</label>
                <EmojiField as="textarea" id="eb-content" className="textarea" rows={2} maxLength={2000} value={content} onChange={setContent} />
              </div>
              <p className="field-help">Mentions in the message won't ping anyone.</p>
              <button type="button" className="button primary" disabled={busy !== null || !channelId || empty || overLimit} onClick={send}>
                {busy === "send" ? "Sending..." : "Send embed"}
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
