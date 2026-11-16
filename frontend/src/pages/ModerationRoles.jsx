// "Make one for me" buttons for the mute and shadowban roles (Moderation page).
// Phoenix creates the role and sets it up in every channel in the background; this
// shows the progress.
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toasts.jsx";

const KINDS = {
  mute: {
    title: "Mute role",
    setting: "moderation.muteRole",
    what: "Makes a “Muted” role and stops it from talking, reacting, making threads and joining voice in every channel.",
  },
  shadowban: {
    title: "Shadowban role",
    setting: "moderation.shadowBannedRole",
    what: "Makes a “Banished” role that hides every channel, and a #shadowbanned channel that's the only one shadowbanned members can see.",
  },
};

export function ModerationRoles({ data, onDone }) {
  const toast = useToast();
  const [job, setJob] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);
  const alive = useRef(true);
  const guildId = data.guild.id;

  const poll = useCallback(async () => {
    try {
      const { job: next } = await api.get(`/guilds/${guildId}/moderation/role-setup`);
      if (!alive.current) return;
      setJob(next);
      if (next?.state === "running") {
        timer.current = setTimeout(poll, 1000);
        return;
      }
      if (next?.state === "done" && next.finishedAt > Date.now() - 15_000) {
        const failed = next.failed ? ` ${next.failed} channel${next.failed === 1 ? "" : "s"} couldn't be changed (Phoenix can't manage ${next.failed === 1 ? "it" : "them"}).` : "";
        const note = next.error ? ` ${next.error}` : "";
        toast(`${KINDS[next.kind].title} is ready.${failed}${note}`, next.failed || next.error ? "error" : undefined);
        onDone();
      }
      if (next?.state === "failed" && next.finishedAt > Date.now() - 15_000) toast(`Couldn't make the role: ${next.error}. Phoenix needs Manage Roles and Manage Channels.`, "error");
    }
    catch {
      // Try again shortly.
      if (alive.current) timer.current = setTimeout(poll, 3000);
    }
  }, [guildId, onDone, toast]);

  useEffect(() => {
    alive.current = true;
    // Pick up a job that's still running (say, after a page reload).
    api.get(`/guilds/${guildId}/moderation/role-setup`).then(({ job: current }) => {
      setJob(current);
      if (current?.state === "running") poll();
    }).catch(() => undefined);
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
    };
  }, [guildId, poll]);

  async function start(kind) {
    setBusy(true);
    setConfirm(null);
    try {
      const { job: started } = await api.post(`/guilds/${guildId}/moderation/role-setup`, { kind });
      setJob(started);
      timer.current = setTimeout(poll, 800);
    }
    catch (err) {
      toast(err.message, "error");
    }
    finally {
      setBusy(false);
    }
  }

  const running = job?.state === "running";

  return (
    <section className="panel">
      <h3>Make the roles for me</h3>
      <p>Phoenix can create the mute and shadowban roles and set their permissions in every channel. It replaces the role picked above.</p>
      <div className="role-setup">
        {Object.entries(KINDS).map(([kind, info]) => {
          const current = data.settings[info.setting];
          const role = data.roles.find((r) => r.id === current);
          const mine = running && job.kind === kind;
          return (
            <div key={kind} className="role-setup-card">
              <h4>{info.title}</h4>
              <p className="field-help">{info.what}</p>
              <p className="field-help">{role ? <>Now: <strong>@{role.name}</strong></> : "None picked yet."}</p>
              {mine ? (
                <div className="role-setup-progress" role="status">
                  <div className="meter"><span style={{ width: `${job.total ? Math.round((job.done / job.total) * 100) : 5}%` }} /></div>
                  <span>{job.total ? `Updating channels: ${job.done} of ${job.total}` : "Creating the role..."}</span>
                </div>
              ) : confirm === kind ? (
                <div className="inline">
                  <button type="button" className="button primary small" disabled={busy} onClick={() => start(kind)}>Yes, make it</button>
                  <button type="button" className="button quiet small" onClick={() => setConfirm(null)}>Cancel</button>
                </div>
              ) : (
                <button type="button" className="button small" disabled={busy || running} onClick={() => setConfirm(kind)}>
                  {role ? `Make a new ${info.title.toLowerCase()}` : `Make the ${info.title.toLowerCase()}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
