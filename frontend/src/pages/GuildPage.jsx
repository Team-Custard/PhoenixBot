import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Link, useRouter } from "../router.jsx";
import { SectionForm } from "../components/SectionForm.jsx";
import { ServerIcon } from "./ServerPicker.jsx";
import { VerificationPanel } from "./VerificationPanel.jsx";
import { RankCardBackground } from "./LevelingExtras.jsx";
import { Levels } from "./Levels.jsx";
import { BotProfile } from "./BotProfile.jsx";
import { EmbedBuilder } from "./EmbedBuilder.jsx";
import { RoleMenus } from "./RoleMenus.jsx";
import { TagsManager } from "./TagsManager.jsx";
import { Cases } from "./Cases.jsx";

// Pages that aren't plain settings forms.
const CUSTOM_PAGES = {
  cases: { name: "Cases", description: "Every warning, mute, kick and ban made with Phoenix. Edit reasons or pardon warnings." },
  rolemenus: { name: "Role menus", description: "Dropdown menus members use to give themselves roles." },
  profile: { name: "Bot profile", description: "Phoenix's nickname and avatar in this server. Server logs use them too." },
  embeds: { name: "Embeds", description: "Build embeds, save them for later and send them to a channel. Saved embeds also show up under Load Embed in /embed.", wide: true },
  levels: { name: "Levels", description: "Everyone's level in this server. Search, change or delete them." },
};

const ORDER = [
  "general", "profile", "moderation", "cases", "logging", "joins", "automod", "discord-automod",
  "welcome", "verification", "rolemenus", "embeds", "starboard", "leveling", "levels", "tags",
];

export function GuildPage({ me, guildId, sectionId }) {
  const { navigate } = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setData(null);
    setError(null);
    try {
      setData(await api.get(`/guilds/${guildId}`));
    }
    catch (err) {
      setError(err);
    }
  }, [guildId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <main className="center-stage">
        <div className="login">
          <h1>{error.body?.error === "bot_not_in_guild" ? "Add Phoenix first" : "Can't open this server"}</h1>
          <p>{error.message}</p>
          <div className="inline">
            {error.body?.inviteUrl && <a className="button primary" href={error.body.inviteUrl}>Add Phoenix</a>}
            <Link className="button" to="/dash">Back to servers</Link>
          </div>
        </div>
      </main>
    );
  }
  if (!data) {
    return <main className="center-stage"><div className="spinner" aria-label="Loading server" /></main>;
  }

  const pages = ORDER.map((id) => {
    const section = data.sections.find((s) => s.id === id);
    if (section) return { id, name: section.name, description: section.description, section };
    if (CUSTOM_PAGES[id]) return { id, ...CUSTOM_PAGES[id] };
    return null;
  }).filter(Boolean);
  const current = pages.find((p) => p.id === sectionId) ?? pages[0];

  const setSettings = (settings) => setData((d) => ({ ...d, settings }));

  const go = (event, to) => {
    if (window.__phoenixDirty && !window.confirm("You have unsaved changes. Leave this page without saving?")) {
      event.preventDefault();
      return;
    }
    if (to) navigate(to);
  };

  return (
    <div className="guild">
      <aside className="sidebar">
        <Link className="back" to="/dash" onClick={(e) => go(e)}>All servers</Link>
        <nav aria-label="Settings pages">
          <ul>
            {pages.map((page) => (
              <li key={page.id}>
                <Link to={`/dash/${guildId}/${page.id}`} aria-current={page.id === current.id ? "page" : undefined} onClick={(e) => go(e)}>
                  {page.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className={`guild-main${current.wide ? " wide" : ""}`}>
        <div className="guild-title">
          <ServerIcon guild={data.guild} />
          <h1>
            {data.guild.name}
            {data.premium && <span className="plus-badge">Plus</span>}
          </h1>
        </div>

        <div className="section-head">
          <h2>{current.name}</h2>
          <p>{current.description}</p>
        </div>

        {current.section && (
          <SectionForm key={current.id} section={current.section} data={data} me={me} onSaved={setSettings}>
            {current.id === "verification" && <VerificationPanel data={data} />}
            {current.id === "leveling" && (
              <>
                <RankCardBackground data={data} onChange={(hasRankCard) => setData((d) => ({ ...d, stats: { ...d.stats, hasRankCard } }))} />
                <section className="panel">
                  <h3>Members' levels</h3>
                  <p>See, change or delete people's levels on the <Link to={`/dash/${guildId}/levels`}>Levels</Link> page.</p>
                </section>
              </>
            )}
            {current.id === "tags" && <TagsManager data={data} onChange={(tags) => setData((d) => ({ ...d, tags }))} />}
          </SectionForm>
        )}
        {current.id === "rolemenus" && <RoleMenus data={data} onSaved={(roleMenus) => setData((d) => ({ ...d, roleMenus }))} />}
        {current.id === "cases" && <Cases data={data} />}
        {current.id === "levels" && <Levels data={data} />}
        {current.id === "profile" && <BotProfile data={data} onChange={(profile) => setData((d) => ({ ...d, bot: { ...d.bot, profile } }))} />}
        {current.id === "embeds" && <EmbedBuilder data={data} me={me?.user} onSaved={(embeds) => setData((d) => ({ ...d, embeds }))} />}
      </main>
    </div>
  );
}
