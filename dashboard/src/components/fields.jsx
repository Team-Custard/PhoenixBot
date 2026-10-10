// Form controls for every setting type described in web/spec.js.
import { useId, useMemo, useState } from "react";

const CHANNEL_PREFIX = { 0: "#", 5: "📢 ", 2: "🔊 ", 13: "🎙 ", 15: "💬 ", 16: "🖼 ", 4: "📁 " };

export function channelLabel(channel) {
  if (!channel) return "Deleted channel";
  return `${CHANNEL_PREFIX[channel.type] ?? "#"}${channel.name}`;
}

export function roleColor(role) {
  return role?.color ? `#${role.color.toString(16).padStart(6, "0")}` : "#99aab5";
}

/** Label, help text and error around a control. */
export function Field({ field, error, children, wide }) {
  const id = useId();
  return (
    <div className={`field${wide || field.type === "list" ? " wide" : ""}`}>
      <div>
        <label className="field-label" htmlFor={id}>{field.label}</label>
        {field.help && <div className="field-help">{field.help}</div>}
      </div>
      <div>
        {typeof children === "function" ? children(id) : children}
        {error && <div className="field-error" role="alert">{error}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- simple inputs

export function TextInput({ id, field, value, onChange }) {
  return (
    <input
      id={id}
      className="input"
      type="text"
      value={value ?? ""}
      maxLength={field.max}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
    />
  );
}

export function TextArea({ id, field, value, onChange, preview }) {
  const length = (value ?? "").length;
  return (
    <>
      <textarea id={id} className="textarea" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      {field.max && <div className={`char-count${length > field.max ? " over" : ""}`}>{length} / {field.max}</div>}
      {preview}
    </>
  );
}

export function UrlInput({ id, value, onChange }) {
  return <input id={id} className="input" type="url" placeholder="https://" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
}

export function EmojiInput({ id, value, onChange }) {
  return <input id={id} className="input" type="text" placeholder="⭐" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
}

export function NumberInput({ id, field, value, onChange }) {
  return (
    <input
      id={id}
      className="input"
      type="number"
      inputMode="numeric"
      min={field.min}
      max={field.max}
      step={1}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
    />
  );
}

export function Toggle({ id, value, onChange, label }) {
  return (
    <label className="switch" htmlFor={id}>
      <input id={id} type="checkbox" role="switch" aria-label={label} checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" aria-hidden="true" />
      <span className="state">{value ? "On" : "Off"}</span>
    </label>
  );
}

export function SelectInput({ id, field, value, onChange }) {
  return (
    <select id={id} className="select" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      {!field.required && <option value="">None</option>}
      {field.required && !value && <option value="">Pick one</option>}
      {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ---------------------------------------------------------------- durations

const UNITS = [
  { id: "second", label: "seconds", ms: 1000 },
  { id: "minute", label: "minutes", ms: 60_000 },
  { id: "hour", label: "hours", ms: 3_600_000 },
  { id: "day", label: "days", ms: 86_400_000 },
];

export function DurationInput({ id, field, value, onChange }) {
  const units = field.units ? UNITS.filter((u) => field.units.includes(u.id)) : UNITS;
  // Pick the largest unit that divides the saved value evenly, once.
  const [unit, setUnit] = useState(() => {
    const ms = Number(value) || 0;
    return [...units].reverse().find((u) => ms > 0 && ms % u.ms === 0) ?? units[units.length - 1];
  });
  const amount = value ? Math.round((Number(value) / unit.ms) * 100) / 100 : 0;

  return (
    <div className="inline">
      <input
        id={id}
        className="input"
        type="number"
        min={0}
        step="any"
        value={amount}
        onChange={(e) => onChange(Math.round((Number(e.target.value) || 0) * unit.ms))}
      />
      {units.length > 1 ? (
        <select
          className="select"
          aria-label="Unit"
          value={unit.id}
          onChange={(e) => {
            const next = units.find((u) => u.id === e.target.value);
            setUnit(next);
            onChange(Math.round(amount * next.ms));
          }}
        >
          {units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
        </select>
      ) : (
        <span className="field-help">{units[0].label}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- channels & roles

/** Channels grouped under their categories, like Discord shows them. */
function useChannelOptions(channels, types) {
  return useMemo(() => {
    const allowed = channels.filter((c) => !types || types.includes(c.type));
    const categories = channels.filter((c) => c.type === 4).sort((a, b) => a.position - b.position);
    const groups = [{ id: null, name: "No category", channels: [] }, ...categories.map((c) => ({ id: c.id, name: c.name, channels: [] }))];
    for (const channel of allowed) {
      const group = groups.find((g) => g.id === (channel.type === 4 ? null : channel.parentId)) ?? groups[0];
      group.channels.push(channel);
    }
    return groups.filter((g) => g.channels.length);
  }, [channels, types]);
}

export function ChannelSelect({ id, field, value, onChange, data, exclude = [] }) {
  const groups = useChannelOptions(data.channels, field.channelTypes);
  const missing = value && !data.channels.some((c) => c.id === value);
  return (
    <select id={id} className="select" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{field.required ? "Pick a channel" : "None"}</option>
      {missing && <option value={value}>Deleted channel</option>}
      {groups.map((group) => (
        <optgroup key={group.id ?? "none"} label={group.name}>
          {group.channels.filter((c) => !exclude.includes(c.id) || c.id === value).map((c) => (
            <option key={c.id} value={c.id}>{channelLabel(c)}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function RoleSelect({ id, field, value, onChange, data, exclude = [] }) {
  const roles = data.roles.filter((r) => !r.managed && (!field.assignable || r.assignable));
  const missing = value && !data.roles.some((r) => r.id === value);
  const current = data.roles.find((r) => r.id === value);
  return (
    <>
      <select id={id} className="select" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">{field.required ? "Pick a role" : "None"}</option>
        {missing && <option value={value}>Deleted role</option>}
        {current && !roles.includes(current) && <option value={current.id}>@{current.name} (Phoenix can't give this out)</option>}
        {roles.filter((r) => !exclude.includes(r.id) || r.id === value).map((r) => <option key={r.id} value={r.id}>@{r.name}</option>)}
        {field.assignable && data.roles.some((r) => !r.managed && !r.assignable) && (
          <option disabled>Roles above Phoenix's own role can't be given out</option>
        )}
      </select>
    </>
  );
}

/** Chips plus a picker to add more: used for channel, role and command lists. */
function MultiPicker({ id, items, value, onChange, renderChip, addLabel, emptyLabel, children }) {
  const selected = value ?? [];
  return (
    <>
      {selected.length > 0 ? (
        <div className="chips">
          {selected.map((itemId) => (
            <span className="chip" key={itemId}>
              {renderChip(items.find((i) => i.id === itemId), itemId)}
              <button type="button" aria-label="Remove" onClick={() => onChange(selected.filter((v) => v !== itemId))}>×</button>
            </span>
          ))}
        </div>
      ) : (
        <p className="empty-hint">{emptyLabel}</p>
      )}
      <select
        id={id}
        className="select"
        value=""
        onChange={(e) => e.target.value && onChange([...selected, e.target.value])}
      >
        <option value="">{addLabel}</option>
        {children}
      </select>
    </>
  );
}

export function ChannelsSelect({ id, field, value, onChange, data }) {
  const groups = useChannelOptions(data.channels, field.channelTypes);
  const selected = value ?? [];
  return (
    <MultiPicker
      id={id}
      items={data.channels}
      value={value}
      onChange={onChange}
      addLabel="Add a channel"
      emptyLabel="No channels picked."
      renderChip={(channel) => <span>{channelLabel(channel)}</span>}
    >
      {groups.map((group) => (
        <optgroup key={group.id ?? "none"} label={group.name}>
          {group.channels.filter((c) => !selected.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{channelLabel(c)}</option>)}
        </optgroup>
      ))}
    </MultiPicker>
  );
}

export function RolesSelect({ id, field, value, onChange, data }) {
  const selected = value ?? [];
  const roles = data.roles.filter((r) => !r.managed && (!field.assignable || r.assignable));
  return (
    <MultiPicker
      id={id}
      items={data.roles}
      value={value}
      onChange={onChange}
      addLabel="Add a role"
      emptyLabel="No roles picked."
      renderChip={(role) => (
        <>
          <i className="dot" style={{ background: roleColor(role) }} />
          <span>{role ? `@${role.name}` : "Deleted role"}</span>
        </>
      )}
    >
      {roles.filter((r) => !selected.includes(r.id)).map((r) => <option key={r.id} value={r.id}>@{r.name}</option>)}
    </MultiPicker>
  );
}

export function CommandsSelect({ id, value, onChange, data }) {
  const selected = value ?? [];
  const items = data.commands.map((c) => ({ ...c, id: c.name }));
  return (
    <MultiPicker
      id={id}
      items={items}
      value={value}
      onChange={onChange}
      addLabel="Add a command"
      emptyLabel="No commands picked."
      renderChip={(command, name) => <span>{name}</span>}
    >
      {items.filter((c) => !selected.includes(c.name)).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
    </MultiPicker>
  );
}

/** A list of short texts, like blocked words. Type and press Enter (or paste a comma-separated list). */
export function StringsInput({ id, field, value, onChange }) {
  const items = value ?? [];
  const [text, setText] = useState("");
  const add = (raw) => {
    const parts = raw.split(/[,\n]/).map((p) => (field.lowercase ? p.trim().toLowerCase() : p.trim())).filter(Boolean);
    const known = new Set(items.map((i) => i.toLowerCase()));
    const next = [...items];
    for (const part of parts) {
      if (!known.has(part.toLowerCase()) && (!field.itemMax || part.length <= field.itemMax)) {
        next.push(part);
        known.add(part.toLowerCase());
      }
    }
    onChange(field.max ? next.slice(0, field.max) : next);
    setText("");
  };
  return (
    <>
      {items.length > 0 ? (
        <div className="chips">
          {items.map((item) => (
            <span className="chip" key={item}>
              <span>{item}</span>
              <button type="button" aria-label={`Remove ${item}`} onClick={() => onChange(items.filter((v) => v !== item))}>×</button>
            </span>
          ))}
        </div>
      ) : (
        <p className="empty-hint">Nothing added yet.</p>
      )}
      <div className="inline">
        <input
          id={id}
          className="input"
          value={text}
          maxLength={field.itemMax ? field.itemMax * 20 : undefined}
          placeholder={field.placeholder ?? "Type and press Enter"}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(text);
            }
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text");
            if (/[,\n]/.test(pasted)) {
              e.preventDefault();
              add(text + pasted);
            }
          }}
        />
        <button type="button" className="button" disabled={!text.trim() || (field.max && items.length >= field.max)} onClick={() => add(text)}>Add</button>
      </div>
      {field.max && items.length > field.max * 0.8 && <div className="char-count">{items.length} / {field.max}</div>}
    </>
  );
}

const TRIGGER_NAMES = { 1: "Blocked words", 3: "Spam", 4: "Flagged words", 5: "Mention spam", 6: "Member profile" };

export function AutomodRuleSelect({ id, value, onChange, data }) {
  const rules = data.automodRules;
  if (!rules) return <p className="field-error">Phoenix can't see this server's AutoMod rules. Give it the Manage Server permission, then reload.</p>;
  const missing = value && !rules.some((r) => r.id === value);
  return (
    <select id={id} className="select" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{rules.length ? "Pick a rule" : "This server has no AutoMod rules"}</option>
      {missing && <option value={value}>Deleted rule</option>}
      {rules.map((r) => (
        <option key={r.id} value={r.id}>{r.name}{TRIGGER_NAMES[r.triggerType] ? ` (${TRIGGER_NAMES[r.triggerType]})` : ""}{r.enabled ? "" : " — off"}</option>
      ))}
    </select>
  );
}

/**
 * Whether a field with showIf should be shown. `get` reads another field's value.
 * showIf can be a key (shown when that field is on), { key, in: [values] }, or a
 * list of those that all have to match.
 */
export function isShown(field, get) {
  if (!field.showIf) return true;
  const rules = Array.isArray(field.showIf) ? field.showIf : [field.showIf];
  return rules.every((rule) => (typeof rule === "string" ? Boolean(get(rule)) : rule.in.includes(get(rule.key))));
}

// ---------------------------------------------------------------- lists

export function ListInput({ field, value, onChange, data }) {
  const rows = value ?? [];
  const update = (index, key, next) => onChange(rows.map((row, i) => (i === index ? { ...row, [key]: next } : row)));
  const blank = Object.fromEntries(field.fields.map((f) => [f.key, f.type === "commands" || f.type === "strings" ? [] : f.type === "duration" ? 0 : null]));

  return (
    <>
      {rows.length === 0 && <p className="empty-hint">Nothing added yet.</p>}
      <div className="list-rows">
        {rows.map((row, index) => (
          <div className="list-row" key={index}>
            {field.fields.filter((sub) => isShown(sub, (key) => row[key])).map((sub) => (
              <div key={sub.key}>
                <label htmlFor={`${field.key}-${index}-${sub.key}`}>{sub.label}</label>
                <Control id={`${field.key}-${index}-${sub.key}`} field={sub} value={row[sub.key]} onChange={(v) => update(index, sub.key, v)} data={data} />
              </div>
            ))}
            <button type="button" className="icon-button" aria-label={`Remove entry ${index + 1}`} onClick={() => onChange(rows.filter((_, i) => i !== index))}>
              ✕
            </button>
          </div>
        ))}
      </div>
      {(!field.max || rows.length < field.max) && (
        <button type="button" className="button small" onClick={() => onChange([...rows, blank])}>Add entry</button>
      )}
    </>
  );
}

// ---------------------------------------------------------------- dispatcher

export function Control(props) {
  switch (props.field.type) {
    case "text": return <TextInput {...props} />;
    case "textarea": return <TextArea {...props} />;
    case "toggle": return <Toggle {...props} />;
    case "number": return <NumberInput {...props} />;
    case "duration": return <DurationInput {...props} />;
    case "channel": return <ChannelSelect {...props} />;
    case "channels": return <ChannelsSelect {...props} />;
    case "role": return <RoleSelect {...props} />;
    case "roles": return <RolesSelect {...props} />;
    case "emoji": return <EmojiInput {...props} />;
    case "url": return <UrlInput {...props} />;
    case "commands": return <CommandsSelect {...props} />;
    case "select": return <SelectInput {...props} />;
    case "list": return <ListInput {...props} />;
    case "strings": return <StringsInput {...props} />;
    case "automodRule": return <AutomodRuleSelect {...props} />;
    default: return <p className="field-error">Unknown setting type {props.field.type}</p>;
  }
}
