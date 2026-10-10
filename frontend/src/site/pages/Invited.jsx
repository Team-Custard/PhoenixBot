import { useTitle } from "../publicApi.js";
import { Link } from "../../router.jsx";

export function Invited() {
  useTitle("Phoenix was added");
  return (
    <main className="page narrow center-page">
      <img src="/success.png" alt="" width={96} height={96} />
      <h1>Phoenix is in!</h1>
      <p className="lede">Thanks for adding Phoenix. Type <code>/</code> in your server to see its commands.</p>
      <div className="hero-actions center">
        <a className="btn flame big" href="/dash">Set it up on the dashboard</a>
        <Link className="btn ghost big" to="/commands">Browse commands</Link>
      </div>
      <p className="muted">Stuck? The <a href="/server">support server</a> is happy to help.</p>
    </main>
  );
}
