import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toasts.jsx";

const TYPES = ["Warn", "Mute", "Unmute", "Kick", "Ban", "Unban", "Shadowban", "Unshadowban"];

function formatDate(seconds) {
  if (!seconds) return "Unknown";
  return new Date(seconds * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function CaseRow({ data, entry, users, onUpdated }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState(entry.reason);
  const [busy, setBusy] = useState(false);
  const name = (id) => users[id] ?? id;
  const inactive = entry.expired || /\((pardoned|expired)\)/.test(entry.punishment);

  async function saveReason() {
    setBusy(true);
    try {
      const result = await api.patch(`/guilds/${data.guild.id}/cases/${entry.caseId}`, { reason });
      onUpdated(result.case);
      setEditing(false);
      toast(`Updated the reason for case ${entry.caseId}.`);
    }
    catch (err) {
      toast(err.message, "error");
    }
    finally {
      setBusy(false);
    }
  }

  async function pardon() {
    if (!window.confirm(`Pardon case ${entry.caseId}? It will stop counting towards the punishment system.`)) return;
    try {
      const result = await api.post(`/guilds/${data.guild.id}/cases/${entry.caseId}/pardon`);
      onUpdated(result.case);
      toast(`Pardoned case ${entry.caseId}.`);
    }
    catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <tr>
      <td className="num">{entry.caseId}</td>
      <td className={`punishment${inactive ? " inactive" : ""}`}>{entry.punishment}</td>
      <td>{name(entry.member)}</td>
      <td className="reason">
        {editing ? (
          <>
            <textarea className="textarea" style={{ minHeight: 70 }} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="inline" style={{ marginTop: 6 }}>
              <button type="button" className="button primary small" disabled={busy || !reason.trim()} onClick={saveReason}>Save reason</button>
              <button type="button" className="button quiet small" onClick={() => { setEditing(false); setReason(entry.reason); }}>Cancel</button>
            </div>
          </>
        ) : entry.reason}
        <div className="field-help">by {entry.hidden ? `${name(entry.moderator)} (hidden from member)` : name(entry.moderator)} on {formatDate(entry.creationDate)}</div>
      </td>
      <td>
        {!editing && (
          <div className="inline">
            <button type="button" className="button small" onClick={() => setEditing(true)}>Edit</button>
            {entry.punishment === "Warn" && <button type="button" className="button small" onClick={pardon}>Pardon</button>}
          </div>
        )}
      </td>
    </tr>
  );
}

export function Cases({ data }) {
  const [member, setMember] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const params = new URLSearchParams({ page: String(page) });
    if (/^\d{17,20}$/.test(member.trim())) params.set("member", member.trim());
    if (type) params.set("type", type);
    try {
      setResult(await api.get(`/guilds/${data.guild.id}/cases?${params}`));
    }
    catch (err) {
      setError(err.message);
    }
  }, [data.guild.id, member, type, page]);

  useEffect(() => {
    load();
  }, [load]);

  const updateCase = (updated) => setResult((r) => ({ ...r, cases: r.cases.map((c) => (c.caseId === updated.caseId ? updated : c)) }));

  return (
    <>
      <div className="filters">
        <label className="visually-hidden" htmlFor="case-member">Member ID</label>
        <input id="case-member" className="input" inputMode="numeric" placeholder="Filter by member ID" value={member} onChange={(e) => { setMember(e.target.value); setPage(0); }} />
        <label className="visually-hidden" htmlFor="case-type">Punishment</label>
        <select id="case-type" className="select" value={type} onChange={(e) => { setType(e.target.value); setPage(0); }}>
          <option value="">All punishments</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {error && <div className="notice error">{error}</div>}
      {!result && !error && <div className="spinner" aria-label="Loading cases" />}
      {result?.cases.length === 0 && <div className="notice">No cases match. Cases appear here when moderators use Phoenix's moderation commands.</div>}
      {result?.cases.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Case</th><th>Action</th><th>Member</th><th>Reason</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
              <tbody>
                {result.cases.map((entry) => (
                  <CaseRow key={entry.caseId} data={data} entry={entry} users={result.users ?? {}} onUpdated={updateCase} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <button type="button" className="button small" disabled={page === 0} onClick={() => setPage(page - 1)}>Newer</button>
            <span>Page {result.page + 1} of {result.pages} ({result.total} cases)</span>
            <button type="button" className="button small" disabled={page + 1 >= result.pages} onClick={() => setPage(page + 1)}>Older</button>
          </div>
        </>
      )}
    </>
  );
}
