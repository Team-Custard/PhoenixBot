// The welcome and goodbye card's preview and background upload, shown under the
// card's settings on the Welcome & goodbye page.
import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toasts.jsx";

const BASE = { welcome: "welcomer", goodbye: "goodbyes" };

/** Draws the card with the unsaved text, a moment after typing stops. */
function useCardPreview(guildId, kind, values, version) {
  const [state, setState] = useState({ url: null, error: null, loading: true });
  const query = new URLSearchParams(Object.entries(values).filter(([, v]) => v !== null && v !== undefined && v !== "")).toString();

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = null;
    let timer = null;
    const draw = async (attempt = 0) => {
      setState((s) => ({ ...s, loading: true }));
      try {
        const response = await fetch(`/api/dashboard/guilds/${guildId}/greeting-card/${kind}?${query}`, { credentials: "same-origin", signal: controller.signal });
        // The server is still drawing the last one: try again in a moment.
        if (response.status === 429 && attempt < 5) {
          timer = setTimeout(() => draw(attempt + 1), 500);
          return;
        }
        if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? "Couldn't draw the preview.");
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setState({ url: objectUrl, error: null, loading: false });
      }
      catch (err) {
        if (!controller.signal.aborted) setState({ url: null, error: err.message, loading: false });
      }
    };
    timer = setTimeout(draw, 450);
    return () => {
      controller.abort();
      clearTimeout(timer);
      if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
    };
  }, [guildId, kind, query, version]);
  return state;
}

export function GreetingCardEditor({ kind, draft, data, onBackgroundChange }) {
  const toast = useToast();
  const base = BASE[kind];
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const lastUrl = useRef(null);
  const hasBackground = Boolean(data.stats?.greetingCards?.[kind]);
  const preview = useCardPreview(data.guild.id, kind, {
    title: draft[`${base}.card.title`],
    subtitle: draft[`${base}.card.subtitle`],
    footer: draft[`${base}.card.footer`],
    overlay: draft[`${base}.card.overlay`],
  }, version);
  if (preview.url) lastUrl.current = preview.url;
  const shown = preview.url ?? lastUrl.current;

  async function upload(file) {
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) return toast("The background has to be a PNG or JPEG image.", "error");
    if (file.size > 8 * 1024 * 1024) return toast("The background can be at most 8 MB.", "error");
    setBusy(true);
    try {
      await api.upload(`/guilds/${data.guild.id}/greeting-card/${kind}/background`, file, file.type);
      onBackgroundChange(kind, true);
      setVersion((v) => v + 1);
      toast(`${kind === "welcome" ? "Welcome" : "Goodbye"} card background updated.`);
    }
    catch (err) {
      toast(err.message, "error");
    }
    finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/guilds/${data.guild.id}/greeting-card/${kind}/background`);
      onBackgroundChange(kind, false);
      setVersion((v) => v + 1);
      toast("Background removed. The card uses Phoenix's background again.");
    }
    catch (err) {
      toast(err.message, "error");
    }
    finally {
      setBusy(false);
    }
  }

  return (
    <div className="greeting-card">
      <div className="preview-label">Preview <span className="muted">· with you as the member</span></div>
      <div className={`greeting-card-frame${preview.loading ? " loading" : ""}`}>
        {shown ? <img src={shown} alt={`Preview of the ${kind} card`} width={1100} height={500} /> : <div className="greeting-card-empty">{preview.error ?? "Drawing the preview…"}</div>}
      </div>
      <div className="greeting-card-actions">
        <label className={`button small${busy ? " disabled" : ""}`}>
          {busy ? "Working..." : hasBackground ? "Change background" : "Upload background"}
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="visually-hidden"
            disabled={busy}
            onChange={(e) => {
              upload(e.target.files?.[0]);
              // Let the same file be picked again after an error.
              e.target.value = "";
            }}
          />
        </label>
        {hasBackground && <button type="button" className="button small danger" disabled={busy} onClick={remove}>Remove background</button>}
        <span className="field-help">PNG or JPEG, up to 8 MB. It's cropped to fit 1100 × 500.</span>
      </div>
    </div>
  );
}
