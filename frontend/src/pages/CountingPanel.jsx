// The count itself (Counting page): where it's at, the best so far, and setting it.
import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toasts.jsx";

export function CountingPanel({ data }) {
  const toast = useToast();
  const [state, setState] = useState(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const channelId = data.settings["counting.channel"];

  useEffect(() => {
    api.get(`/guilds/${data.guild.id}/counting`).then(setState).catch(() => setState(null));
  }, [data.guild.id, channelId]);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const next = await api.put(`/guilds/${data.guild.id}/counting`, { count: Number(value) });
      setState(next);
      setValue("");
      toast(`The count is now ${next.count}. The next number is ${next.count + 1}.`);
    }
    catch (err) {
      toast(err.message, "error");
    }
    finally {
      setBusy(false);
    }
  }

  if (!channelId) return null;
  return (
    <section className="panel">
      <h3>The count</h3>
      {state ? (
        <div className="counting-stats">
          <div><span className="counting-number">{state.count.toLocaleString()}</span><span className="field-help">so far</span></div>
          <div><span className="counting-number">{(state.count + 1).toLocaleString()}</span><span className="field-help">next number</span></div>
          <div><span className="counting-number">{state.highScore.toLocaleString()}</span><span className="field-help">best{state.highScoreAt ? `, ${new Date(state.highScoreAt * 1000).toLocaleDateString()}` : ""}</span></div>
        </div>
      ) : <p className="field-help">Save the counting channel to start counting.</p>}
      <form className="inline" onSubmit={save} style={{ marginTop: 14 }}>
        <label className="visually-hidden" htmlFor="counting-set">Set the count</label>
        <input id="counting-set" className="input" type="number" min={0} step={1} inputMode="numeric" placeholder="Set the count to..." value={value} onChange={(e) => setValue(e.target.value)} style={{ maxWidth: 220 }} />
        <button type="submit" className="button" disabled={busy || value === "" || Number(value) < 0}>{busy ? "Saving..." : "Set count"}</button>
      </form>
      <p className="field-help" style={{ marginTop: 8 }}>Members carry on from the number after it. Setting it doesn't change the best score unless it's higher.</p>
    </section>
  );
}
