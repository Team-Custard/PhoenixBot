import { Link } from "../../router.jsx";
import { useTitle } from "../publicApi.js";

export function NotFound() {
  useTitle("Not found");
  return (
    <main className="page narrow center-page">
      <img src="/phoenixerror.png" alt="" width={120} height={120} />
      <h1>Well, damn.</h1>
      <p className="lede">That page wasn't found. Skill issue (ours, probably).</p>
      <Link className="btn flame" to="/">Go home</Link>
    </main>
  );
}
