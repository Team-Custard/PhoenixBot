import { useEffect, useState } from "react";
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
      const image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await api.put(`/guilds/${data.guild.id}/leveling/background`, { image });
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
          <input type="file" accept="image/png" className="visually-hidden" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
        </label>
        {hasCard && <button type="button" className="button danger" disabled={busy} onClick={remove}>Remove background</button>}
      </div>
    </section>
  );
}

export function Leaderboard({ data }) {
  const [members, setMembers] = useState(null);
  useEffect(() => {
    api.get(`/guilds/${data.guild.id}/leaderboard`).then((r) => setMembers(r.members)).catch(() => setMembers([]));
  }, [data.guild.id]);

  return (
    <section className="panel">
      <h3>Leaderboard</h3>
      {members === null && <div className="spinner" aria-label="Loading" />}
      {members?.length === 0 && <p>Nobody has earned XP yet.</p>}
      {members?.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Rank</th><th>Member</th><th>Level</th><th>XP</th></tr></thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={m.userId}>
                  <td className="num">{i + 1}</td>
                  <td>{m.username ?? m.userId}</td>
                  <td className="num">{m.level}</td>
                  <td className="num">{m.xp} / {m.needed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
