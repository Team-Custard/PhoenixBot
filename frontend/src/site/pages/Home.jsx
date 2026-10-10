import { useState } from "react";
import { Link, useRouter } from "../../router.jsx";
import { formatNumber, useStats, useTitle } from "../publicApi.js";
import { ChatDemo } from "../ChatDemo.jsx";
import { Icon } from "../icons.jsx";

const FEATURES = [
  {
    icon: "shield",
    title: "Moderation that keeps receipts",
    text: "Warn, mute, kick, ban and shadowban with numbered cases, DM notices, a mod log and a punishment system that escalates on its own.",
    size: "wide",
  },
  {
    icon: "robot",
    title: "Automod with teeth",
    text: "Nine filters for spam, invites, links, caps, mass mentions and blocked words, plus punishments for breaking your Discord AutoMod rules.",
    size: "wide",
  },
  { icon: "scroll", title: "Server logs", text: "Edits, deletes, joins, roles and voice, posted under your bot's own server name and avatar." },
  { icon: "trophy", title: "Leveling", text: "XP for chatting, reward roles, rank cards with your own background and a public leaderboard page." },
  { icon: "wave", title: "Welcome & verification", text: "Greetings, goodbyes, welcome DMs, a join gate for new accounts and a verify button." },
  { icon: "list", title: "Role menus", text: "Dropdowns members use to pick their own colors, pings and pronoun roles." },
  { icon: "palette", title: "Embed builder", text: "Design embeds with a live preview, save them and send them to any channel." },
  { icon: "tag", title: "Tags", text: "Saved replies for the questions your server answers ten times a day." },
  { icon: "globe", title: "Translation", text: "Right-click any message to read it in your own language." },
  { icon: "clock", title: "UserDB", text: "Share your time zone and pronouns so friends know when (and how) to ping you." },
];

function LeaderboardFinder() {
  const { navigate } = useRouter();
  const [id, setId] = useState("");
  const valid = /^\d{17,20}$/.test(id.trim());
  return (
    <form
      className="finder"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) navigate(`/leaderboard/${id.trim()}`);
      }}
    >
      <label htmlFor="finder-id" className="visually-hidden">Server ID</label>
      <input id="finder-id" inputMode="numeric" placeholder="Paste a server ID" value={id} onChange={(e) => setId(e.target.value)} />
      <button type="submit" className="btn flame" disabled={!valid}>View leaderboard <Icon name="arrow" size={18} /></button>
    </form>
  );
}

function Embers() {
  // Fixed positions so the page looks the same on every render.
  const embers = Array.from({ length: 22 }, (_, i) => ({
    left: `${(i * 37 + 11) % 100}%`,
    delay: `${(i * 1.7) % 9}s`,
    duration: `${9 + ((i * 13) % 8)}s`,
    size: `${3 + ((i * 7) % 5)}px`,
    drift: `${((i * 29) % 60) - 30}px`,
  }));
  return (
    <div className="embers" aria-hidden="true">
      {embers.map((e, i) => (
        <span key={i} style={{ left: e.left, animationDelay: e.delay, animationDuration: e.duration, width: e.size, height: e.size, "--drift": e.drift }} />
      ))}
    </div>
  );
}

export function Home() {
  useTitle(null);
  const stats = useStats();

  return (
    <main className="home">
      <section className="hero">
        <Embers />
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="eyebrow"><Icon name="sparkle" size={16} /> Free and open source</p>
            <h1>
              Now you're thinking with <span className="flame-text">Discord bots.</span>
            </h1>
            <p className="lede">
              Phoenix does the jobs you'd normally invite five bots for: moderation, automod, logs,
              leveling, welcome messages and role menus. Set it all up from one dashboard.
            </p>
            <div className="hero-actions">
              <a className="btn flame big" href="/invite">Add to Discord</a>
              <a className="btn ghost big" href="/dash">Open the dashboard</a>
            </div>
            {stats && (stats.servers || stats.commands) ? (
              <dl className="hero-stats">
                {stats.servers ? <div><dt>Servers</dt><dd>{formatNumber(stats.servers)}</dd></div> : null}
                {stats.members ? <div><dt>Members</dt><dd>{formatNumber(stats.members)}</dd></div> : null}
                {stats.commands ? <div><dt>Commands</dt><dd>{stats.commands}</dd></div> : null}
              </dl>
            ) : null}
          </div>
          <ChatDemo />
        </div>
      </section>

      <section className="section features" aria-labelledby="features-title">
        <div className="section-head">
          <p className="eyebrow">Everything in one place</p>
          <h2 id="features-title">One bot. Fewer tabs open.</h2>
        </div>
        <div className="bento">
          {FEATURES.map((f) => (
            <article key={f.title} className={`bento-card${f.size ? ` ${f.size}` : ""}`}>
              <span className="bento-icon"><Icon name={f.icon} /></span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
        <p className="center"><Link className="text-link" to="/commands">See every command <Icon name="arrow" size={16} /></Link></p>
      </section>

      <section className="section split" aria-labelledby="dash-title">
        <div className="split-copy">
          <p className="eyebrow">The dashboard</p>
          <h2 id="dash-title">Settings belong on a settings page.</h2>
          <p>
            No more memorising config commands. Log in with Discord, pick your server and flip switches.
            Everything Phoenix does is set up there, with previews so you can see your welcome message
            or embed before anyone else does.
          </p>
          <ul className="checks">
            <li><Icon name="check" size={18} /> Only people with Manage Server can change anything</li>
            <li><Icon name="check" size={18} /> Changes reach the bot within a minute</li>
            <li><Icon name="check" size={18} /> Edit cases, levels and saved embeds without typing a command</li>
          </ul>
          <a className="btn flame" href="/dash">Open the dashboard</a>
        </div>
        <div className="mock-dash" aria-hidden="true">
          <div className="mock-side">
            <span className="mock-logo" />
            {["General", "Bot profile", "Moderation", "Automod", "Logging", "Leveling", "Embeds"].map((item, i) => (
              <span key={item} className={i === 3 ? "active" : ""}>{item}</span>
            ))}
          </div>
          <div className="mock-main">
            <div className="mock-title">Automod</div>
            {[["Spam", true, "Delete and mute"], ["Server invites", true, "Delete and warn"], ["Blocked words", true, "Delete the message"], ["Links", false, ""], ["Capital letters", false, ""]].map(([name, on, action]) => (
              <div key={name} className={`mock-row${on ? " on" : ""}`}>
                <div>
                  <strong>{name}</strong>
                  {on && <small>{action}</small>}
                </div>
                <span className="mock-switch" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section leader" aria-labelledby="lb-title">
        <div className="podium" aria-hidden="true">
          {[{ n: 2, c: "#c9d1e0", h: 96, l: "Wren", lvl: 31 }, { n: 1, c: "#ffc857", h: 132, l: "Foxy", lvl: 42 }, { n: 3, c: "#e39b6a", h: 76, l: "Abby", lvl: 27 }].map((p) => (
            <div key={p.n} className={`podium-spot p${p.n}`}>
              <span className="podium-avatar" style={{ borderColor: p.c }}>{p.l[0]}</span>
              <span className="podium-name">{p.l}</span>
              <span className="podium-level">Level {p.lvl}</span>
              <div className="podium-block" style={{ height: p.h, background: `linear-gradient(180deg, ${p.c}33, transparent)`, borderColor: `${p.c}66` }}>
                <span style={{ color: p.c }}>{p.n}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="split-copy">
          <p className="eyebrow">Public leaderboards</p>
          <h2 id="lb-title">Bragging rights, with a link.</h2>
          <p>
            Every server with leveling gets its own leaderboard page. The leaderboard command posts the
            link, or paste your server's ID here. Prefer to keep it private? There's a switch for that.
          </p>
          <LeaderboardFinder />
        </div>
      </section>

      <section className="section facts">
        <article className="fact-card">
          <span className="fact-emoji" aria-hidden="true">🐢</span>
          <div>
            <p className="eyebrow">Fun fact</p>
            <p>The turtle emoji is actually Carl-bot on Android 11 and newer, and anywhere else that uses Google's emojis.</p>
          </div>
        </article>
        <article className="fact-card">
          <span className="fact-emoji" aria-hidden="true"><Icon name="code" size={40} /></span>
          <div>
            <p className="eyebrow">Open source</p>
            <p>Phoenix's code is on GitHub. Read it, run your own copy, or send a fix. <a href="https://github.com/team-custard/phoenixbot">Visit the repository</a>.</p>
          </div>
        </article>
      </section>

      <section className="cta">
        <h2>Ready when your server is.</h2>
        <p>Add Phoenix, open the dashboard, and you're set up in a few minutes.</p>
        <div className="hero-actions center">
          <a className="btn flame big" href="/invite">Add to Discord</a>
          <a className="btn ghost big" href="/server">Join the support server</a>
        </div>
      </section>
    </main>
  );
}
