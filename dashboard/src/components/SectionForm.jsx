// Draws one settings page from its spec and saves only that page's values.
import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { Control, Field } from "./fields.jsx";
import { MessagePreview } from "./Preview.jsx";
import { SaveBar } from "./SaveBar.jsx";
import { useToast } from "./Toasts.jsx";

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

export function SectionForm({ section, data, me, onSaved, children }) {
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

  return (
    <>
      <div className="fields">
        {section.fields.map((field) => (
          <Field key={field.key} field={field} error={errors[field.key]}>
            {(id) => (
              <Control
                id={id}
                field={field}
                value={draft[field.key]}
                onChange={(value) => setDraft((d) => ({ ...d, [field.key]: value }))}
                data={data}
                preview={field.preview ? (
                  <MessagePreview text={draft[field.key]} user={me.user} guild={data.guild} extra={{ level: "5" }} />
                ) : null}
              />
            )}
          </Field>
        ))}
      </div>
      {children}
      {dirty && <SaveBar saving={saving} onSave={save} onReset={() => setDraft(saved)} />}
    </>
  );
}
