import { useState } from "react";
import { useTitle } from "../publicApi.js";
import { Icon } from "../icons.jsx";

export function Timezone() {
  useTitle("Find your time zone");
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [copied, setCopied] = useState(false);
  return (
    <main className="page narrow">
      <header className="page-head">
        <p className="eyebrow">UserDB</p>
        <h1>Your time zone is</h1>
      </header>
      <div className="tz-box">
        <code>{zone || "Unknown"}</code>
        {zone && (
          <button type="button" className="btn ghost" onClick={() => navigator.clipboard?.writeText(zone).then(() => setCopied(true), () => undefined)}>
            <Icon name={copied ? "check" : "copy"} size={18} /> {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      <p>
        Use <code>/userdb set</code> and paste this as your time zone. Then people can use the timefor
        command, or your <a href="/api">UserDB API</a> profile, to see what time it is for you.
      </p>
      <p className="muted">This was worked out by your browser (the <a href="https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/resolvedOptions">Intl API</a>). Nothing was sent to Phoenix.</p>
    </main>
  );
}
