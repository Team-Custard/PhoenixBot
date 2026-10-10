import { guildIcon } from "../api.js";
import { Link } from "../router.jsx";

export function ServerIcon({ guild, size = 128 }) {
  const icon = guildIcon(guild, size);
  const initials = guild.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3);
  return <span className="server-icon">{icon ? <img src={icon} alt="" /> : initials}</span>;
}

export function ServerPicker({ me }) {
  const present = me.guilds.filter((g) => g.botPresent);
  const absent = me.guilds.filter((g) => !g.botPresent);

  return (
    <main className="picker">
      <h1>Pick a server</h1>
      <p>These are the servers where you have Manage Server.</p>

      {me.guilds.length === 0 && (
        <div className="notice">
          You don't manage any servers yet. Ask for the Manage Server permission, or <a href={me.inviteUrl}>add Phoenix to a server you own</a>.
        </div>
      )}

      <ul className="server-list">
        {present.map((guild) => (
          <li className="server-row" key={guild.id}>
            <ServerIcon guild={guild} />
            <span className="name">{guild.name}</span>
            <Link className="button primary small" to={`/dash/${guild.id}`}>Open settings</Link>
          </li>
        ))}
        {absent.map((guild) => (
          <li className="server-row absent" key={guild.id}>
            <ServerIcon guild={guild} />
            <span className="name">{guild.name} <span className="status">Phoenix isn't here yet</span></span>
            <a className="button small" href={guild.inviteUrl}>Add Phoenix</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
