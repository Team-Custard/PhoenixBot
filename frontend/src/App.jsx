import { useEffect, useState } from "react";
import { api, userAvatar } from "./api.js";
import { Link, matchPath, useRouter } from "./router.jsx";
import { Login } from "./pages/Login.jsx";
import { ServerPicker } from "./pages/ServerPicker.jsx";
import { GuildPage } from "./pages/GuildPage.jsx";
import { useToast } from "./components/Toasts.jsx";

function TopBar({ me }) {
  const toast = useToast();
  async function logout() {
    try {
      await api.post("/logout");
    }
    catch (err) {
      toast(err.message, "error");
    }
    window.location.href = "/";
  }
  return (
    <header className="topbar">
      <Link className="brand" to="/dash">
        <img src="/phoenixlogo.png" alt="" />
        Phoenix
      </Link>
      {me && (
        <div className="account">
          <img src={userAvatar(me.user)} alt="" />
          <span className="name">{me.user.globalName || me.user.username}</span>
          <button type="button" className="button quiet small" onClick={logout}>Log out</button>
        </div>
      )}
    </header>
  );
}

export function App() {
  const { path } = useRouter();
  const [me, setMe] = useState(undefined);

  useEffect(() => {
    document.title = "Dashboard · PhoenixBot";
    api.get("/me").then(setMe).catch((err) => setMe(err.status === 401 ? null : { error: err.message }));
  }, []);

  let page;
  if (me === undefined) page = <main className="center-stage"><div className="spinner" aria-label="Loading" /></main>;
  else if (me === null) page = <Login />;
  else if (me.error) page = <main className="center-stage"><div className="notice error">{me.error}</div></main>;
  else {
    const guildRoute = matchPath("/dash/:guildId/:section?", path);
    page = guildRoute
      ? <GuildPage key={guildRoute.guildId} me={me} guildId={guildRoute.guildId} sectionId={guildRoute.section} />
      : <ServerPicker me={me} />;
  }

  return (
    <>
      <TopBar me={me?.user ? me : null} />
      {page}
    </>
  );
}
