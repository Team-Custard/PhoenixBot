import { useState } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toasts.jsx";

export function RankCardBackground({ data, onChange }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const hasCard = data.stats.hasRankCard;

  async function upload(file) {
    if (!file) return;
    if (file.type !== "image/png") return toast("The background has to be a PNG image.", "error");
    if (file.size > 8 * 1024 * 1024) return toast("The background can be at most 8 MB.", "error");
    setBusy(true);
    try {
      await api.upload(`/guilds/${data.guild.id}/leveling/background`, file, "image/png");
      onChange(true);
      toast("Rank card background updated.");
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
      await api.delete(`/guilds/${data.guild.id}/leveling/background`);
      onChange(false);
      toast("Rank card background removed.");
    }
    catch (err) {
      toast(err.message, "error");
    }
    finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h3>Rank card background</h3>
      <p>A PNG image shown behind everyone's rank card. {hasCard ? "This server has a custom background." : "This server uses the default background."}</p>
      <div className="row">
        <label className="button" style={{ flex: "none" }}>
          {busy ? "Uploading..." : "Upload PNG"}
          <input
            type="file"
            accept="image/png"
            className="visually-hidden"
            disabled={busy}
            onChange={(e) => {
              upload(e.target.files?.[0]);
              // Let the same file be picked again after an error.
              e.target.value = "";
            }}
          />
        </label>
        {hasCard && <button type="button" className="button danger" disabled={busy} onClick={remove}>Remove background</button>}
      </div>
    </section>
  );
}
