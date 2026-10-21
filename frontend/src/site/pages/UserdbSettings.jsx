import { useEffect, useMemo, useState } from "react";
import { api, userAvatar } from "../../api.js";
import { Link } from "../../router.jsx";
import { useTitle } from "../publicApi.js";
import { Icon } from "../icons.jsx";
import { EmojiField } from "../../components/emoji/EmojiField.jsx";

const PRONOUNS = ["she/her", "he/him", "they/them", "she/they", "he/they", "any pronouns", "ask me"];

const EMPTY = {
  timezone: "",
  pronouns: "",
  description: "",
  socials: { youtube: "", twitter: "", reddit: "", server: "" },
  ephemeral: false,
};

function allTimeZones() {
  try {
    return Intl.supportedValuesOf("timeZone");
  }
  catch {
    return ["UTC", "Europe/London", "Europe/Berlin", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Asia/Tokyo", "Australia/Sydney"];
  }
}

function detectTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  }
  catch {
    return "";
  }
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function Clock({ timezone }) {
  const now = useNow();
  if (!timezone) return null;
  try {
    const time = new Intl.DateTimeFormat(undefined, { timeZone: timezone, hour: "numeric", minute: "2-digit", second: "2-digit" }).format(now);
    const date = new Intl.DateTimeFormat(undefined, { timeZone: timezone, weekday: "long", month: "long", day: "numeric" }).format(now);
    return <p className="ud-clock"><Icon name="clock" size={18} /> It's <strong>{time}</strong> on {date} there.</p>;
  }
  catch {
    return <p className="ud-clock error">That isn't a time zone Phoenix knows. Pick one from the list.</p>;
  }
}

function toForm(profile) {
  if (!profile) return EMPTY;
  return {
    timezone: profile.timezone ?? "",
    pronouns: profile.pronouns ?? "",
    description: profile.description ?? "",
    socials: {
      youtube: profile.socials?.youtube ?? "",
      twitter: profile.socials?.twitter ?? "",
      reddit: profile.socials?.reddit ?? "",
      server: profile.socials?.server ?? "",
    },
    ephemeral: Boolean(profile.ephemeral),
  };
}

export function UserdbSettings() {
  useTitle("Your UserDB profile");
  const [state, setState] = useState({ loading: true });
  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(JSON.stringify(EMPTY));
  const [status, setStatus] = useState(null);
  const [errorField, setErrorField] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const zones = useMemo(allTimeZones, []);
  const detected = useMemo(detectTimeZone, []);

  useEffect(() => {
    api.get("/userdb")
      .then((data) => {
        const next = toForm(data.profile);
        setState({ user: data.user, profile: data.profile });
        setForm(next);
        setSaved(JSON.stringify(next));
      })
      .catch((err) => setState({ error: err }));
  }, []);

  const dirty = JSON.stringify(form) !== saved;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setSocial = (key, value) => setForm((f) => ({ ...f, socials: { ...f.socials, [key]: value } }));

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    setErrorField(null);
    try {
      const data = await api.put("/userdb", form);
      const next = toForm(data.profile);
      setState((s) => ({ ...s, profile: data.profile }));
      setForm(next);
      setSaved(JSON.stringify(next));
      setStatus({ ok: true, text: "Saved. Phoenix uses it everywhere right away." });
    }
    catch (err) {
      setErrorField(err.body?.field ?? null);
      setStatus({ ok: false, text: err.message });
    }
    finally {
      setBusy(false);
    }
  }

  async function clearAfk() {
    try {
      const data = await api.delete("/userdb/afk");
      setState((s) => ({ ...s, profile: data.profile }));
      setStatus({ ok: true, text: "Cleared your AFK status." });
    }
    catch (err) {
      setStatus({ ok: false, text: err.message });
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.delete("/userdb");
      setState((s) => ({ ...s, profile: null }));
      setForm(EMPTY);
      setSaved(JSON.stringify(EMPTY));
      setConfirmDelete(false);
      setStatus({ ok: true, text: "Deleted. Phoenix no longer has any UserDB data about you." });
    }
    catch (err) {
      setStatus({ ok: false, text: err.message });
    }
    finally {
      setBusy(false);
    }
  }

  if (state.loading) return <main className="page narrow"><div className="loading" aria-label="Loading"><span /><span /><span /></div></main>;

  if (state.error) {
    const loggedOut = state.error.status === 401;
    return (
      <main className="page narrow center-page">
        <span className="empty-emoji" aria-hidden="true">{loggedOut ? "👋" : "⚠️"}</span>
        <h1>{loggedOut ? "Your UserDB profile" : "Couldn't load UserDB"}</h1>
        <p className="lede">
          {loggedOut
            ? "Share your time zone, pronouns and socials, so people know when (and how) to ping you. Log in with Discord to set it up."
            : state.error.message}
        </p>
        {loggedOut && <a className="btn flame big" href="/dash/login?next=/userdb">Log in with Discord</a>}
      </main>
    );
  }

  const { user, profile } = state;
  const field = (name) => (errorField === name ? " has-error" : "");

  return (
    <main className="page narrow userdb-page">
      <header className="page-head ud-head">
        <img src={userAvatar(user, 128)} alt="" width={72} height={72} />
        <div>
          <p className="eyebrow">UserDB</p>
          <h1>Your profile</h1>
          <p className="lede">This follows you to every server with Phoenix. People can see it with <code>/userdb display</code>, <code>/userdb timefor</code> and on your <Link to={`/u/${user.id}`}>profile page</Link>.</p>
        </div>
      </header>

      {profile?.afk && (
        <div className="callout ud-afk">
          <span>💤 You're AFK: <strong>{profile.afk.reason}</strong>{profile.afk.since ? ` (since ${new Date(profile.afk.since * 1000).toLocaleString()})` : ""}</span>
          <button type="button" className="btn ghost small" onClick={clearAfk}>Clear AFK</button>
        </div>
      )}

      <form className="ud-form" onSubmit={save}>
        <section className="ud-card">
          <h2>Time zone</h2>
          <p className="muted">So <code>timefor</code> can tell people what time it is for you.</p>
          <div className={`ud-row${field("timezone")}`}>
            <label className="visually-hidden" htmlFor="ud-tz">Time zone</label>
            <input id="ud-tz" list="ud-tz-list" value={form.timezone} placeholder="Start typing, like America/New_York" onChange={(e) => set({ timezone: e.target.value })} autoComplete="off" />
            <datalist id="ud-tz-list">
              {zones.map((z) => <option key={z} value={z} />)}
            </datalist>
            {detected && form.timezone !== detected && (
              <button type="button" className="btn ghost" onClick={() => set({ timezone: detected })}>
                <Icon name="sparkle" size={16} /> Use {detected.replace(/_/g, " ")}
              </button>
            )}
          </div>
          {detected && <p className="muted small">Your browser says you're in <strong>{detected.replace(/_/g, " ")}</strong>.</p>}
          <Clock timezone={form.timezone} />
        </section>

        <section className="ud-card">
          <h2>Pronouns</h2>
          <div className="ud-chips" role="group" aria-label="Common pronouns">
            {PRONOUNS.map((p) => (
              <button key={p} type="button" aria-pressed={form.pronouns === p} onClick={() => set({ pronouns: form.pronouns === p ? "" : p })}>{p}</button>
            ))}
          </div>
          <label className="visually-hidden" htmlFor="ud-pronouns">Pronouns</label>
          <input id="ud-pronouns" className={field("pronouns")} maxLength={40} value={form.pronouns} placeholder="Or type your own" onChange={(e) => set({ pronouns: e.target.value })} />
        </section>

        <section className="ud-card">
          <h2>About you</h2>
          <label className="visually-hidden" htmlFor="ud-about">About you</label>
          <EmojiField as="textarea" id="ud-about" className={field("description").trim()} maxLength={300} rows={3} value={form.description} placeholder="Hello, I'm a Phoenix user." onChange={(description) => set({ description })} unicodeOnly />
          <p className="muted small ud-count">{form.description.length} / 300</p>
        </section>

        <section className="ud-card">
          <h2>Socials</h2>
          <div className="ud-socials">
            {[
              ["youtube", "YouTube", "@yourchannel"],
              ["twitter", "Twitter / X", "@yourname"],
              ["reddit", "Reddit", "u/yourname"],
              ["server", "Discord server", "discord.gg/invite"],
            ].map(([key, label, placeholder]) => (
              <label key={key} className={field(`socials.${key}`)}>
                <span>{label}</span>
                <input value={form.socials[key]} placeholder={placeholder} maxLength={100} onChange={(e) => setSocial(key, e.target.value)} />
              </label>
            ))}
          </div>
          <p className="muted small">Paste a handle or a link; Phoenix tidies it up.</p>
        </section>

        <section className="ud-card">
          <h2>Privacy</h2>
          <label className="ud-toggle">
            <input type="checkbox" checked={form.ephemeral} onChange={(e) => set({ ephemeral: e.target.checked })} />
            <span>
              <strong>Only show me the answers to my app commands</strong>
              <span className="muted">Right-click commands like “Time for user” and “Translate message” reply privately.</span>
            </span>
          </label>
        </section>

        <div className={`ud-save${dirty ? " dirty" : ""}`}>
          {status && <p className={status.ok ? "ud-ok" : "ud-error"} role="status">{status.text}</p>}
          <button type="submit" className="btn flame big" disabled={busy || !dirty}>{busy ? "Saving..." : profile ? "Save changes" : "Create my profile"}</button>
        </div>
      </form>

      {profile && (
        <section className="ud-card ud-danger">
          <h2>Delete my UserDB data</h2>
          <p className="muted">Removes your time zone, pronouns, description, socials and AFK status from Phoenix's database. You can set it up again any time.</p>
          {!confirmDelete ? (
            <button type="button" className="btn ghost danger" onClick={() => setConfirmDelete(true)}>Delete my data...</button>
          ) : (
            <div className="hero-actions">
              <button type="button" className="btn danger-solid" disabled={busy} onClick={remove}>Yes, delete everything</button>
              <button type="button" className="btn ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
