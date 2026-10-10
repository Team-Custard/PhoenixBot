import { useState } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toasts.jsx";

export function HoneypotPanel({ data }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const channelId = data.settings["automod.honeypot.channel"];
  const channel = data.channels.find((c) => c.id === channelId);

  async function post() {
    setBusy(true);
    try {
      await api.post(`/guilds/${data.guild.id}/honeypot/warning`);
      toast(`Posted the warning in #${channel?.name ?? "the honeypot channel"}.`);
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
      <h3>Honeypot warning</h3>
      <p>
        Real members need to know not to post in the honeypot channel. Post the warning there, and keep the
        channel near the top of the list where bots will find it.{!channelId && " Pick and save a honeypot channel first."}
      </p>
      <button type="button" className="button primary" disabled={!channelId || busy} onClick={post}>
        {busy ? "Posting..." : channel ? `Post the warning in #${channel.name}` : "Post the warning"}
      </button>
    </section>
  );
}
