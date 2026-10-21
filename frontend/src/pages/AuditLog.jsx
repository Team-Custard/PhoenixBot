// Who changed what on this dashboard.
import { useCallback, useEffect, useState } from "react";
import { api, userAvatar } from "../api.js";
import { channelLabel, roleColor } from "../components/fields.jsx";

function timeAgo(date) {
  const seconds = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  const units = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
  const [unit, size] = units.find(([, s]) => seconds >= s) ?? ["second", 1];
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(-Math.floor(seconds / size), unit);
}

/** Turns <#id> and <@&id> in a summary into names. */
function Summary({ text, data }) {
  const parts = String(text).split(/(<#\d+>|<@&\d+>|<@!?\d+>)/);
  return parts.map((part, i) => {
    const channel = /^<#(\d+)>$/.exec(part);
    if (channel) return <span key={i} className="mention">{channelLabel(data.channels.find((c) => c.id === channel[1]))}</span>;
    const role = /^<@&(\d+)>$/.exec(part);
    if (role) return <span key={i} className="mention">@{data.roles.find((r) => r.id === role[1])?.name ?? "deleted role"}</span>;
    const user = /^<@!?(\d+)>$/.exec(part);
    if (user) return <span key={i} className="mention">@{user[1]}</span>;
    return part;
  });
}

function Value({ type, value, data }) {
  if (value === null || value === undefined || (Array.isArray(value) && !value.length)) return <span className="audit-none">none</span>;
  if (typeof value === "object" && !Array.isArray(value)) return <span>{value.count} {value.count === 1 ? "entry" : "entries"}</span>;
  if (type === "toggle") return <span>{value ? "On" : "Off"}</span>;
  if (type === "channel") return <span className="mention">{channelLabel(data.channels.find((c) => c.id === value))}</span>;
  if (type === "channels") return <span>{value.map((id) => channelLabel(data.channels.find((c) => c.id === id))).join(", ")}</span>;
  if (type === "role" || type === "roles") {
    const ids = Array.isArray(value) ? value : [value];
    return <span>{ids.map((id) => { const r = data.roles.find((x) => x.id === id); return <span key={id} className="mention" style={{ color: roleColor(r) }}>@{r?.name ?? "deleted role"} </span>; })}</span>;
  }
  if (type === "duration") return <span>{value ? `${Math.round(value / 60000) >= 1 ? `${Math.round(value / 60000)} min` : `${Math.round(value / 1000)} s`}` : "Off"}</span>;
  return <span className="audit-text">{Array.isArray(value) ? value.join(", ") : String(value)}</span>;
}

export function AuditLog({ data }) {
  const [page, setPage] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setResult(await api.get(`/guilds/${data.guild.id}/audit?page=${page}`));
    }
    catch (err) {
      setError(err.message);
    }
  }, [data.guild.id, page]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <div className="notice error">{error}</div>;
  if (!result) return <div className="spinner" aria-label="Loading the audit log" />;
  if (!result.entries.length) return <div className="notice">Nothing has been changed on the dashboard yet. Changes show up here as people make them.</div>;

  return (
    <>
      <ol className="audit-list">
        {result.entries.map((entry) => (
          <li key={entry.id}>
            <img src={userAvatar({ id: entry.userId, avatar: entry.avatar }, 64)} alt="" width={36} height={36} />
            <div className="audit-body">
              <div className="audit-line">
                <strong>{entry.username}</strong> <Summary text={entry.summary} data={data} />
                <time dateTime={entry.createdAt} title={new Date(entry.createdAt).toLocaleString()}>{timeAgo(entry.createdAt)}</time>
              </div>
              {entry.changes?.length > 0 && (
                <>
                  <button type="button" className="button quiet small" aria-expanded={open === entry.id} onClick={() => setOpen(open === entry.id ? null : entry.id)}>
                    {open === entry.id ? "Hide" : "Show"} {entry.changes.length} {entry.changes.length === 1 ? "change" : "changes"}
                  </button>
                  {open === entry.id && (
                    <table className="table audit-changes">
                      <thead><tr><th>Setting</th><th>Before</th><th>After</th></tr></thead>
                      <tbody>
                        {entry.changes.map((change, i) => (
                          <tr key={i}>
                            <td>{change.label}</td>
                            <td><Value type={change.type} value={change.before} data={data} /></td>
                            <td><Value type={change.type} value={change.after} data={data} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="pager">
        <button type="button" className="button small" disabled={page === 0} onClick={() => setPage(page - 1)}>Newer</button>
        <span>Page {result.page + 1} of {result.pages} ({result.total} changes, kept for 180 days)</span>
        <button type="button" className="button small" disabled={page + 1 >= result.pages} onClick={() => setPage(page + 1)}>Older</button>
      </div>
    </>
  );
}
