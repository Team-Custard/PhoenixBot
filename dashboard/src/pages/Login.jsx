import { loginUrl } from "../api.js";

export function Login() {
  const params = new URLSearchParams(window.location.search);
  const failed = params.get("login") === "failed";
  const cancelled = params.get("login") === "cancelled";
  return (
    <main className="center-stage">
      <div className="login">
        <img src="/phoenixlogo.png" alt="" />
        <h1>Set up Phoenix for your server</h1>
        <p>Logging, moderation, welcome messages, leveling and everything else, in one place instead of a pile of commands.</p>
        {failed && <div className="notice error">{params.get("reason") || "Logging in didn't work. Try again."}</div>}
        {cancelled && <div className="notice">You cancelled the login. Log in whenever you're ready.</div>}
        <a className="button primary" href={loginUrl(params.get("next") || "/dash")}>Log in with Discord</a>
      </div>
    </main>
  );
}
