// Draws one settings page from its spec and saves only that page's values.
import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { Control, Field, isShown } from "./fields.jsx";
import { MessagePreview } from "./Preview.jsx";
import { SaveBar } from "./SaveBar.jsx";
import { useToast } from "./Toasts.jsx";
import { PlaceholderHelp } from "./PlaceholderHelp.jsx";

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function useUnsavedWarning(dirty) {
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.__phoenixDirty = true;
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.__phoenixDirty = false;
    };
  }, [dirty]);
}

/** Splits a section's fields into runs of ungrouped fields and named groups, in order. */
function groupFields(section) {
  const blocks = [];
  for (const field of section.fields) {
    const last = blocks[blocks.length - 1];
    if (last && last.group === (field.group ?? null)) last.fields.push(field);
    else blocks.push({ key: `${field.group ?? "fields"}-${blocks.length}`, group: field.group ?? null, fields: [field] });
  }
  return blocks;
}

export function SectionForm({ section, data, me, onSaved, focus, children }) {
  const toast = useToast();
  const saved = useMemo(
    () => Object.fromEntries(section.fields.map((f) => [f.key, data.settings[f.key] ?? null])),
    [section, data.settings],
  );
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setDraft(saved);
    setErrors({});
  }, [saved]);

  // Coming from the search bar: scroll to the setting and make it flash.
  useEffect(() => {
    if (!focus?.key) return;
    const el = document.querySelector(`[data-field="${CSS.escape(focus.key)}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
    el.querySelector("input, select, textarea, button")?.focus({ preventScroll: true });
  }, [focus]);

  const changed = section.fields.filter((f) => !same(draft[f.key], saved[f.key]));
  const dirty = changed.length > 0;
  useUnsavedWarning(dirty);

  async function save() {
    setSaving(true);
    setErrors({});
    try {
      const values = Object.fromEntries(changed.map((f) => [f.key, draft[f.key]]));
      const result = await api.patch(`/guilds/${data.guild.id}/settings/${section.id}`, { values });
      onSaved(result.settings);
      toast("Changes saved. The bot picks them up within a minute.");
    }
    catch (err) {
      if (err.body?.field) setErrors({ [err.body.field]: err.message });
      toast(err.message, "error");
    }
    finally {
      setSaving(false);
    }
  }

  function renderField(field) {
    return (
      <Field key={field.key} field={field} error={errors[field.key]}>
        {(id) => (
          <Control
            id={id}
            field={field}
            value={draft[field.key]}
            onChange={(value) => setDraft((d) => ({ ...d, [field.key]: value }))}
            data={data}
            preview={field.preview ? (
              <MessagePreview text={draft[field.key]} data={data} me={me.user} extra={{ level: "5" }} />
            ) : null}
          />
        )}
      </Field>
    );
  }

  return (
    <>
      {section.placeholders && <div className="section-tools"><PlaceholderHelp data={data} only={section.id} /></div>}
      {groupFields(section).map((block) => {
        const shown = block.fields.filter((f) => isShown(f, (key) => draft[key]));
        if (!block.group) return <div key={block.key} className="fields">{shown.map(renderField)}</div>;
        const meta = section.groups?.[block.group] ?? { label: block.group };
        // A filter's on/off switch sits in the group's header.
        const toggle = block.fields.find((f) => f.groupToggle);
        const rest = shown.filter((f) => f !== toggle);
        return (
          <section key={block.key} data-field={`group:${block.group}`} className={`field-group${toggle && !draft[toggle.key] ? " off" : ""}`}>
            <header>
              <div>
                <h3>{meta.label}</h3>
                {meta.help && <p>{meta.help}</p>}
              </div>
              {toggle && (
                <Control
                  id={`group-${block.group}`}
                  field={toggle}
                  value={draft[toggle.key]}
                  onChange={(value) => setDraft((d) => ({ ...d, [toggle.key]: value }))}
                  data={data}
                  label={meta.label}
                />
              )}
            </header>
            {rest.length > 0 && <div className="fields">{rest.map(renderField)}</div>}
          </section>
        );
      })}
      {children}
      {dirty && <SaveBar saving={saving} onSave={save} onReset={() => setDraft(saved)} />}
    </>
  );
}
