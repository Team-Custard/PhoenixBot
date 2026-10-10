import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toasts.jsx";

const xpForLevel = (level) => 42 * level || 1;

function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function Progress({ xp, needed }) {
  const percent = Math.min(100, Math.round((xp / needed) * 100));
  return (
    <div className="xp">
      <div className="xp-bar" role="progressbar" aria-valuenow={xp} aria-valuemin={0} aria-valuemax={needed} aria-label="XP to next level">
        <span style={{ width: `${percent}%` }} />
      </div>
      <span className="xp-text">{xp} / {needed} XP</span>
    </div>
  );
}

function LevelEditor({ initialLevel = 0, initialXp = 0, busy, onSave, onCancel, saveLabel = "Save" }) {
  const [level, setLevel] = useState(String(initialLevel));
  const [xp, setXp] = useState(String(initialXp));
  const levelNumber = Number.parseInt(level, 10);
  const xpNumber = Number.parseInt(xp || "0", 10);
  const maxXp = Number.isInteger(levelNumber) ? xpForLevel(levelNumber) - 1 : 0;
  const valid = Number.isInteger(levelNumber) && levelNumber >= 0 && levelNumber <= 10000 && Number.isInteger(xpNumber) && xpNumber >= 0 && xpNumber <= maxXp;
  return (
    <form
      className="level-editor"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave({ level: levelNumber, xp: xpNumber });
      }}
    >
      <label>
        <span className="field-help">Level</span>
        <input className="input" type="number" min={0} max={10000} value={level} onChange={(e) => setLevel(e.target.value)} />
      </label>
      <label>
        <span className="field-help">XP (0–{Math.max(0, maxXp)})</span>
        <input className="input" type="number" min={0} max={maxXp} value={xp} onChange={(e) => setXp(e.target.value)} />
      </label>
      <div className="inline">
        <button type="submit" className="button primary small" disabled={busy || !valid}>{saveLabel}</button>
        {onCancel && <button type="button" className="button quiet small" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

function LevelRow({ guildId, entry, onChanged, onDeleted }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const name = entry.displayName ?? entry.userId;

  async function save(values) {
    setBusy(true);
    try {
      const { member } = await api.put(`/guilds/${guildId}/levels/${entry.userId}`, values);
      onChanged(member);
      setEditing(false);
      toast(`${name} is now level ${member.level}.`);
    }
    catch (err) {
      toast(err.message, "error");
    }
    finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete ${name}'s level? They'll start again from level 0 next time they chat.`)) return;
    setBusy(true);
    try {
      await api.delete(`/guilds/${guildId}/levels/${entry.userId}`);
      onDeleted(entry.userId);
      toast(`Deleted ${name}'s level.`);
    }
    catch (err) {
      toast(err.message, "error");
      setBusy(false);
    }
  }

  return (
    <tr>
      <td className="num rank">{entry.rank}</td>
      <td>
        <div className="who">
          {entry.avatar && <img src={entry.avatar} alt="" width={32} height={32} loading="lazy" />}
          <div>
            <div>{name}</div>
            {entry.username && entry.username !== name && <div className="field-help">@{entry.username}</div>}
          </div>
        </div>
      </td>
      <td>
        {editing ? (
          <LevelEditor initialLevel={entry.level} initialXp={entry.xp} busy={busy} onSave={save} onCancel={() => setEditing(false)} />
        ) : (
          <>
            <strong className="level-number">Level {entry.level}</strong>
            <Progress xp={entry.xp} needed={entry.needed} />
          </>
        )}
      </td>
      <td>
        {!editing && (
          <div className="inline">
            <button type="button" className="button small" onClick={() => setEditing(true)}>Edit</button>
            <button type="button" className="button small danger" disabled={busy} onClick={remove}>Delete</button>
          </div>
        )}
      </td>
    </tr>
  );
}

function AddMember({ guildId, onAdded }) {
  const toast = useToast();
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const validId = /^\d{17,20}$/.test(userId.trim());

  async function save(values) {
    if (!validId) return toast("Enter the member's user ID (right-click them in Discord → Copy User ID).", "error");
    setBusy(true);
    try {
      const { member } = await api.put(`/guilds/${guildId}/levels/${userId.trim()}`, values);
      onAdded(member);
      toast(`${member.displayName ?? member.userId} is now level ${member.level}.`);
      setUserId("");
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
      <h3>Set someone's level</h3>
      <p>Gives a level to anyone, including people who haven't earned XP yet. Level reward roles are handed out the next time they level up.</p>
      <label className="field-label" htmlFor="level-user">User ID</label>
      <input id="level-user" className="input" inputMode="numeric" placeholder="e.g. 123456789012345678" value={userId} onChange={(e) => setUserId(e.target.value)} />
      <LevelEditor busy={busy} onSave={save} saveLabel="Set level" />
    </section>
  );
}

function ResetAll({ data, onReset }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  async function reset() {
    setBusy(true);
    try {
      const result = await api.delete(`/guilds/${data.guild.id}/levels`, { confirm: typed });
      toast(`Reset ${result.deleted} ${result.deleted === 1 ? "member" : "members"}.`);
      setOpen(false);
      setTyped("");
      onReset();
    }
    catch (err) {
      toast(err.message, "error");
    }
    finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel danger-zone">
      <h3>Reset everyone</h3>
      <p>Deletes every level in this server. This can't be undone.</p>
      {!open ? (
        <button type="button" className="button danger" onClick={() => setOpen(true)}>Reset all levels...</button>
      ) : (
        <>
          <label className="field-label" htmlFor="reset-confirm">Type <strong>{data.guild.name}</strong> to confirm</label>
          <input id="reset-confirm" className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          <div className="inline" style={{ marginTop: 10 }}>
            <button type="button" className="button danger" disabled={busy || typed.trim() !== data.guild.name} onClick={reset}>Reset all levels</button>
            <button type="button" className="button quiet" onClick={() => { setOpen(false); setTyped(""); }}>Cancel</button>
          </div>
        </>
      )}
    </section>
  );
}

export function Levels({ data }) {
  const guildId = data.guild.id;
  const [search, setSearch] = useState("");
  const query = useDebounced(search.trim());
  const [page, setPage] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const params = new URLSearchParams({ page: String(page) });
    if (query) params.set("search", query);
    try {
      setResult(await api.get(`/guilds/${guildId}/levels?${params}`));
    }
    catch (err) {
      setError(err.message);
    }
  }, [guildId, query, page]);

  useEffect(() => {
    load();
  }, [load]);

  const replace = (member) => setResult((r) => {
    if (!r) return r;
    const exists = r.members.some((m) => m.userId === member.userId);
    return exists ? { ...r, members: r.members.map((m) => (m.userId === member.userId ? member : m)) } : r;
  });
  const removeRow = (userId) => setResult((r) => (!r ? r : { ...r, total: r.total - 1, members: r.members.filter((m) => m.userId !== userId) }));
  const publicUrl = `${window.location.origin}/leaderboard/${guildId}`;

  return (
    <>
      <div className="notice">
        Anyone can see the top of the leaderboard at <a href={publicUrl} target="_blank" rel="noreferrer">{publicUrl.replace(/^https?:\/\//, "")}</a>
        {(data.settings["leveling.publicLeaderboard"] === false || !data.settings["leveling.enable"]) && " once leveling and the public leaderboard are turned on (Leveling page)"}.
      </div>

      <div className="filters">
        <label className="visually-hidden" htmlFor="level-search">Search</label>
        <input id="level-search" className="input" type="search" placeholder="Search by name or user ID" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
      </div>

      {error && <div className="notice error">{error}</div>}
      {!result && !error && <div className="spinner" aria-label="Loading levels" />}
      {result?.members.length === 0 && (
        <div className="notice">{query ? "Nobody with a level matches that search." : "Nobody has earned XP yet. Turn on leveling on the Leveling page and people will start gaining XP as they chat."}</div>
      )}
      {result?.members.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="table levels">
              <thead><tr><th>Rank</th><th>Member</th><th>Level</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
              <tbody>
                {result.members.map((entry) => (
                  <LevelRow key={entry.userId} guildId={guildId} entry={entry} onChanged={replace} onDeleted={removeRow} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <button type="button" className="button small" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {result.page + 1} of {result.pages} ({result.total} {result.total === 1 ? "member" : "members"})</span>
            <button type="button" className="button small" disabled={page + 1 >= result.pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </>
      )}

      <AddMember guildId={guildId} onAdded={(member) => { replace(member); load(); }} />
      <ResetAll data={data} onReset={() => { setPage(0); load(); }} />
    </>
  );
}
