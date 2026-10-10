// The public website: everything outside /dash.
import { useEffect, useState } from "react";
import { Link, matchPath, useRouter } from "../router.jsx";
import { useStats } from "./publicApi.js";
import { Home } from "./pages/Home.jsx";
import { Commands } from "./pages/Commands.jsx";
import { Leaderboard } from "./pages/Leaderboard.jsx";
import { Profile } from "./pages/Profile.jsx";
import { Timezone } from "./pages/Timezone.jsx";
import { ApiDocs } from "./pages/ApiDocs.jsx";
import { Terms, Privacy } from "./pages/Legal.jsx";
import { Invited } from "./pages/Invited.jsx";
import { NotFound } from "./pages/NotFound.jsx";

const ROUTES = [
  ["/", () => <Home />],
  ["/commands", () => <Commands />],
  ["/leaderboard/:guildId", (p) => <Leaderboard key={p.guildId} guildId={p.guildId} />],
  ["/u/:id", (p) => <Profile key={p.id} id={p.id} />],
  ["/userdb/tzhelp", () => <Timezone />],
  ["/api", () => <ApiDocs />],
  ["/terms", () => <Terms />],
  ["/privacy", () => <Privacy />],
  ["/success", () => <Invited />],
];

const NAV = [
  { to: "/commands", label: "Commands" },
  { to: "/api", label: "API" },
  { href: "/plus", label: "Plus" },
  { href: "/server", label: "Support" },
];

function Header() {
  const { path } = useRouter();
  const stats = useStats();
  const [open, setOpen] = useState(false);
  const staging = stats?.mode && stats.mode !== "prod";
  useEffect(() => setOpen(false), [path]);

  return (
    <>
      {staging && (
        <div className="staging-banner" role="note">
          You're on the <strong>{stats.mode}</strong> version of PhoenixBot. Looking for the main site? <a href="https://phoenix.sylveondev.xyz">phoenix.sylveondev.xyz</a>
        </div>
      )}
      <header className={`site-header${open ? " open" : ""}`}>
        <Link to="/" className="site-brand" aria-label="PhoenixBot home">
          <img src={staging ? "/staginglogo.png" : "/phoenixlogo.png"} alt="" width={36} height={36} />
          <span>Phoenix</span>
        </Link>
        <button type="button" className="menu-button" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen(!open)}>
          <span className="visually-hidden">Menu</span>
          <span aria-hidden="true" />
        </button>
        <nav id="site-nav" aria-label="Main">
          <ul>
            {NAV.map((item) => (
              <li key={item.label}>
                {item.to
                  ? <Link to={item.to} aria-current={path === item.to ? "page" : undefined}>{item.label}</Link>
                  : <a href={item.href}>{item.label}</a>}
              </li>
            ))}
          </ul>
          <div className="nav-actions">
            <a className="btn ghost" href="/dash">Dashboard</a>
            <a className="btn flame" href="/invite">Add to Discord</a>
          </div>
        </nav>
      </header>
    </>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src="/phoenixlogo.png" alt="" width={44} height={44} />
          <div>
            <strong>PhoenixBot</strong>
            <p>A Discord bot by SylveonDev and Team Custard. Not affiliated with Discord.</p>
          </div>
        </div>
        <nav aria-label="Footer">
          <div>
            <h2>Bot</h2>
            <a href="/invite">Add to Discord</a>
            <a href="/dash">Dashboard</a>
            <Link to="/commands">Commands</Link>
            <a href="/plus">Phoenix Plus</a>
          </div>
          <div>
            <h2>Community</h2>
            <a href="/server">Support server</a>
            <a href="https://github.com/team-custard/phoenixbot">GitHub</a>
            <Link to="/api">API</Link>
          </div>
          <div>
            <h2>Legal</h2>
            <Link to="/terms">Terms of service</Link>
            <Link to="/privacy">Privacy policy</Link>
          </div>
        </nav>
      </div>
    </footer>
  );
}

export function Site() {
  const { path } = useRouter();
  let page = null;
  for (const [pattern, render] of ROUTES) {
    const params = matchPath(pattern, path);
    if (params) {
      page = render(params);
      break;
    }
  }
  return (
    <div className="site">
      <a className="skip-link" href="#content">Skip to content</a>
      <Header />
      <div id="content">{page ?? <NotFound />}</div>
      <Footer />
    </div>
  );
}
