import { useEffect, useState } from "react";
import { Link } from "../../router.jsx";
import { useJson, useTitle } from "../publicApi.js";
import { Icon } from "../icons.jsx";

function useClock(timezone) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!timezone) return undefined;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [timezone]);
  if (!timezone) return null;
  try {
    return {
      time: new Intl.DateTimeFormat(undefined, { timeZone: timezone, hour: "numeric", minute: "2-digit", second: "2-digit" }).format(now),
      date: new Intl.DateTimeFormat(undefined, { timeZone: timezone, weekday: "long", month: "long", day: "numeric" }).format(now),
    };
  }
  catch {
    return null;
  }
}

const SOCIALS = [
  { key: "youtube", label: "YouTube", url: (v) => (v.startsWith("http") ? v : `https://youtube.com/${v}`) },
  { key: "twitter", label: "Twitter / X", url: (v) => (v.startsWith("http") ? v : `https://x.com/${v.replace(/^@/, "")}`) },
  { key: "reddit", label: "Reddit", url: (v) => (v.startsWith("http") ? v : `https://reddit.com/user/${v.replace(/^u\//, "")}`) },
  { key: "server", label: "Discord server", url: (v) => (v.startsWith("http") ? v : `https://discord.gg/${v}`) },
];

function safeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  }
  catch {
    return null;
  }
}

export function Profile({ id }) {
  const { data, error, loading } = useJson(`/api/public/userdb/${id}`);
  useTitle(data ? `${data.displayName}'s profile` : "UserDB profile");
  const clock = useClock(data?.timezone);

  if (loading) return <main className="page"><div className="loading" aria-label="Loading profile"><span /><span /><span /></div></main>;
  if (error) {
    return (
      <main className="page">
        <div className="empty-state">
          <span className="empty-emoji" aria-hidden="true">🫥</span>
          <h2>No profile here</h2>
          <p>{error.message} People can make one with <code>/userdb set</code>.</p>
          <Link className="btn ghost" to="/">Back to the home page</Link>
        </div>
      </main>
    );
  }

  const accent = data.accentColor ? `#${data.accentColor.toString(16).padStart(6, "0")}` : null;
  const socials = SOCIALS.map((s) => ({ ...s, value: data.socials?.[s.key] })).filter((s) => s.value).map((s) => ({ ...s, href: safeUrl(s.url(s.value)) })).filter((s) => s.href);

  return (
    <main className="page profile">
      <article className="profile-card">
        <div className="profile-banner" style={data.banner ? { backgroundImage: `url(${data.banner})` } : accent ? { background: accent } : undefined} aria-hidden="true" />
        <img className="profile-avatar" src={data.avatar} alt="" width={112} height={112} />
        <h1>{data.displayName}</h1>
        <p className="profile-handle">@{data.username}{data.pronouns && <span className="profile-pronouns">{data.pronouns}</span>}</p>
        {data.afk && <p className="profile-afk">💤 AFK: {data.afk.reason}</p>}

        {clock ? (
          <div className="profile-clock">
            <Icon name="clock" size={22} />
            <div>
              <strong>{clock.time}</strong>
              <span>{clock.date} · {data.timezone.replace(/_/g, " ")}</span>
            </div>
          </div>
        ) : (
          <p className="profile-muted">No time zone set.</p>
        )}

        {data.description && <p className="profile-about">{data.description}</p>}

        {socials.length > 0 && (
          <ul className="profile-socials">
            {socials.map((s) => <li key={s.key}><a href={s.href} rel="noreferrer nofollow" target="_blank">{s.label}</a></li>)}
          </ul>
        )}
      </article>
      <p className="profile-foot">Profile from PhoenixBot's UserDB. Make your own with <code>/userdb set</code>.</p>
    </main>
  );
}
