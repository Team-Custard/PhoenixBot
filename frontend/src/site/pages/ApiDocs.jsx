import { useState } from "react";
import { useTitle } from "../publicApi.js";
import { Clicker, YourButton, useClicker } from "../Clicker.jsx";

const ENDPOINTS = [
  { path: "/api/profile/[id]", text: "A user's whole UserDB profile: time zone, pronouns, description, socials and AFK status." },
  { path: "/api/pronouns/[id]", text: "A user's pronouns." },
  { path: "/api/timefor/[id]", text: "The current time and date for a user, in their time zone." },
  { path: "/api/socials/[id]", text: "A user's social media handles." },
  { path: "/api/public/leaderboard/[server id]", text: "The top 100 of a server's leaderboard, if the server has it public." },
  { path: "/api/public/commands", text: "Every command, with its arguments and subcommands." },
];

export function ApiDocs() {
  useTitle("API");
  const [id, setId] = useState("");
  const [result, setResult] = useState(null);
  const [clicks, click] = useClicker();
  const valid = /^\d{17,20}$/.test(id.trim());

  async function tryIt(path) {
    setResult({ loading: true });
    try {
      const response = await fetch(path.replace(/\[(server )?id\]/, id.trim()));
      const text = await response.text();
      let body = text;
      try {
        body = JSON.stringify(JSON.parse(text), null, 2);
      }
      catch {
        // Not JSON, show as is.
      }
      setResult({ status: response.status, body });
    }
    catch (err) {
      setResult({ status: "error", body: err.message });
    }
  }

  return (
    <main className="page narrow">
      <header className="page-head">
        <p className="eyebrow">Developers</p>
        <h1>The Phoenix API</h1>
        <p className="lede">Use bits of Phoenix in your own projects. Everything here is a simple <code>GET</code> request that returns JSON, with no key needed.</p>
      </header>

      <div className="callout">UserDB profiles are set up with <code>/userdb set</code> in Discord. The API can only read them.</div>

      <section className="api-list" aria-label="Endpoints">
        {ENDPOINTS.map((e) => (
          <article key={e.path} className="api-item">
            <div className="api-path"><span className="method">GET</span><code>{e.path}</code></div>
            <p>{e.text}</p>
            {e.path.includes("[") && (
              <button type="button" className="btn ghost small" disabled={!valid} onClick={() => tryIt(e.path)}>Try it</button>
            )}
            {!e.path.includes("[") && (
              <button type="button" className="btn ghost small" onClick={() => tryIt(e.path)}>Try it</button>
            )}
          </article>
        ))}
      </section>

      <section className="api-vanity">
        <h2>VanityDB</h2>
        <p>Have an awesome custom vanity link for <YourButton onClick={click} /> server. This database isn't released yet and doesn't do anything at the moment.</p>
      </section>
      <Clicker clicks={clicks} />

      <section className="api-tester" aria-labelledby="tester-title">
        <h2 id="tester-title">Try it out</h2>
        <label htmlFor="api-id">User or server ID</label>
        <input id="api-id" inputMode="numeric" placeholder="e.g. 763631377152999435" value={id} onChange={(e) => setId(e.target.value)} />
        <p className="muted">Then press “Try it” on an endpoint above. In Discord, turn on Developer Mode and right-click someone → Copy User ID.</p>
        {result && (
          <pre className="api-result" aria-live="polite">{result.loading ? "Loading..." : `HTTP ${result.status}\n\n${result.body}`}</pre>
        )}
      </section>
    </main>
  );
}
