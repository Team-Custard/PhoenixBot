// How each followed account is doing (Notifications page): whether Phoenix found it,
// when it last checked, and any problem.
import { useEffect, useState } from "react";
import { api } from "../api.js";

const PLATFORMS = { youtube: "YouTube", twitch: "Twitch", bluesky: "Bluesky", x: "X", reddit: "Reddit", rss: "RSS" };

function ago(ms) {
  const minutes = Math.round((Date.now() - ms) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
}

export function NotificationsStatus({ data }) {
  const rows = data.settings.notifications ?? [];
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!rows.length) return undefined;
    let cancelled = false;
    const load = () => api.get(`/guilds/${data.guild.id}/notifications/status`).then((r) => !cancelled && setStatus(r.accounts)).catch(() => undefined);
    load();
    // New accounts are checked within a minute or two.
    const timer = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [data.guild.id, rows]);

  if (!rows.length) return null;
  return (
    <section className="panel">
      <h3>Account status</h3>
      <p>New accounts are checked within a couple of minutes. Phoenix only announces what's posted after that.</p>
      <ul className="notify-status">
        {rows.map((row, index) => {
          const s = status?.[index];
          const state = row.enabled === false ? "off" : s?.error ? "error" : s?.ready ? "ok" : "waiting";
          return (
            <li key={`${row.platform}-${row.account}-${index}`} className={state}>
              <span className="notify-platform">{PLATFORMS[row.platform] ?? row.platform}</span>
              <span className="notify-account">
                <strong>{s?.name || row.account}</strong>
                {s?.name && s.name !== row.account && <span className="field-help">{row.account}</span>}
              </span>
              <span className="notify-state">
                {state === "off" && "Turned off"}
                {state === "error" && s.error}
                {state === "ok" && `Checked ${ago(s.lastChecked)}`}
                {state === "waiting" && (status ? "Waiting for the first check" : "Loading...")}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
