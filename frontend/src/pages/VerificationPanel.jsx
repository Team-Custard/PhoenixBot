import { useState } from "react";
import { api } from "../api.js";
import { ChannelSelect } from "../components/fields.jsx";
import { useToast } from "../components/Toasts.jsx";

export function VerificationPanel({ data }) {
  const toast = useToast();
  const [channelId, setChannelId] = useState(null);
  const [label, setLabel] = useState("Verify");
  const [busy, setBusy] = useState(false);
  const ready = Boolean(data.settings["verification.role"]);

  async function post() {
    setBusy(true);
    try {
      await api.post(`/guilds/${data.guild.id}/verification/post`, { channelId, label });
      toast("Verification panel posted.");
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
      <h3>Post the verification panel</h3>
      <p>Sends the panel text with a button people press to verify. {ready ? "" : "Pick and save a verified role first."}</p>
      <div className="row">
        <div>
          <label htmlFor="verify-channel">Channel</label>
          <ChannelSelect id="verify-channel" field={{ channelTypes: [0, 5], required: true }} value={channelId} onChange={setChannelId} data={data} />
        </div>
        <div>
          <label htmlFor="verify-label">Button text</label>
          <input id="verify-label" className="input" maxLength={80} value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <button type="button" className="button primary" disabled={!ready || !channelId || busy} onClick={post}>
          {busy ? "Posting..." : "Post panel"}
        </button>
      </div>
    </section>
  );
}
