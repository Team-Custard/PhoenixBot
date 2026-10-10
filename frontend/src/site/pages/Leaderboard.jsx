import { useMemo, useState } from "react";
import { Link } from "../../router.jsx";
import { useJson, useTitle } from "../publicApi.js";
import { Icon } from "../icons.jsx";

const MEDALS = { 1: "#ffc857", 2: "#c9d1e0", 3: "#e39b6a" };

function guildIconUrl(guild, size = 128) {
  if (!guild?.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${guild.icon.startsWith("a_") ? "gif" : "png"}?size=${size}`;
}

function initials(name = "") {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase() || "?";
}

function GuildHeader({ guild, total }) {
  const icon = guildIconUrl(guild);
  return (
    <header className="lb-head">
      {guild.banner && (
        <div className="lb-banner" style={{ backgroundImage: `url(https://cdn.discordapp.com/banners/${guild.id}/${guild.banner}.png?size=1024)` }} aria-hidden="true" />
      )}
      <div className="lb-guild">
        {icon ? <img src={icon} alt="" width={88} height={88} /> : <span className="lb-guild-fallback">{initials(guild.name)}</span>}
        <div>
          <p className="eyebrow">Leaderboard</p>
          <h1>{guild.name}</h1>
          {total !== undefined && <p className="lb-count">{total.toLocaleString()} {total === 1 ? "member has" : "members have"} earned XP</p>}
        </div>
      </div>
    </header>
  );
}

function Bar({ xp, needed }) {
  const percent = Math.min(100, Math.round((xp / Math.max(1, needed)) * 100));
  return (
    <div className="lb-bar" role="progressbar" aria-valuenow={xp} aria-valuemin={0} aria-valuemax={needed} aria-label="XP to next level">
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}

function Podium({ members }) {
  const order = [members[1], members[0], members[2]].filter(Boolean);
  return (
    <ol className="lb-podium" aria-label="Top three">
      {order.map((m) => (
        <li key={m.rank} className={`lb-top r${m.rank}`} style={{ "--medal": MEDALS[m.rank] }}>
          <span className="lb-rank-badge">{m.rank}</span>
          <img src={m.avatar} alt="" width={m.rank === 1 ? 104 : 84} height={m.rank === 1 ? 104 : 84} />
          <strong>{m.displayName}</strong>
          <span className="lb-level">Level {m.level}</span>
          <Bar xp={m.xp} needed={m.needed} />
          <span className="lb-xp">{m.xp.toLocaleString()} / {m.needed.toLocaleString()} XP</span>
        </li>
      ))}
    </ol>
  );
}

export function Leaderboard({ guildId }) {
  const { data, error, loading } = useJson(`/api/public/leaderboard/${guildId}`);
  const [query, setQuery] = useState("");
  useTitle(data?.guild ? `${data.guild.name} leaderboard` : "Leaderboard");

  const rest = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const list = q ? data.members : data.members.slice(3);
    return q ? list.filter((m) => `${m.displayName} ${m.username ?? ""}`.toLowerCase().includes(q)) : list;
  }, [data, query]);

  if (loading) {
    return <main className="page"><div className="loading" aria-label="Loading leaderboard"><span /><span /><span /></div></main>;
  }

  if (error) {
    return (
      <main className="page lb">
        <div className="empty-state">
          <span className="empty-emoji" aria-hidden="true">{error.body?.error === "private" ? "🔒" : "🔍"}</span>
          <h2>{error.body?.error === "private" ? "This leaderboard is private" : "Leaderboard not found"}</h2>
          <p>
            {error.body?.error === "private"
              ? "This server's admins keep levels private, or leveling is turned off. Members can still check their rank with /leveling rank."
              : error.message}
          </p>
          <Link className="btn ghost" to="/">Back to the home page</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page lb">
      <GuildHeader guild={data.guild} total={data.total} />

      {data.members.length === 0 ? (
        <div className="empty-state">
          <span className="empty-emoji" aria-hidden="true">💬</span>
          <h2>No one's on the board yet</h2>
          <p>Members earn XP by chatting. Check back soon!</p>
        </div>
      ) : (
        <>
          {!query && <Podium members={data.members.slice(0, 3)} />}

          {data.members.length > 3 && (
            <label className="search lb-search">
              <Icon name="search" size={18} />
              <span className="visually-hidden">Find a member</span>
              <input type="search" placeholder="Find someone in the top 100" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
          )}

          {rest.length > 0 && (
            <ol className="lb-list">
              {rest.map((m) => (
                <li key={m.rank}>
                  <span className="lb-pos" style={MEDALS[m.rank] ? { color: MEDALS[m.rank] } : undefined}>{m.rank}</span>
                  <img src={m.avatar} alt="" width={44} height={44} loading="lazy" />
                  <div className="lb-who">
                    <strong>{m.displayName}</strong>
                    {m.username && m.username !== m.displayName && <span>@{m.username}</span>}
                  </div>
                  <div className="lb-progress">
                    <Bar xp={m.xp} needed={m.needed} />
                    <span className="lb-xp">{m.xp.toLocaleString()} / {m.needed.toLocaleString()} XP</span>
                  </div>
                  <span className="lb-lvl"><small>Level</small>{m.level}</span>
                </li>
              ))}
            </ol>
          )}
          {query && rest.length === 0 && <div className="callout">No one in the top 100 matches “{query}”.</div>}
          {data.total > data.members.length && <p className="lb-note">Showing the top {data.members.length} of {data.total.toLocaleString()}.</p>}
        </>
      )}

      <aside className="lb-admin">
        <Icon name="sliders" size={20} />
        <p>Run this server? Change, reset or hide levels on the <a href={`/dash/${guildId}/levels`}>dashboard</a>.</p>
      </aside>
    </main>
  );
}
