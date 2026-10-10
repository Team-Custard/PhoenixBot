import { useState } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toasts.jsx";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

export function BotProfile({ data, onChange }) {
  const toast = useToast();
  const profile = data.bot.profile;
  const [nick, setNick] = useState(profile.nick ?? "");
  const [busy, setBusy] = useState(null);
  const shownName = nick.trim() || profile.username;
  const shownAvatar = profile.avatar ?? profile.userAvatar;
  const webhookName = /discord|clyde/i.test(shownName) ? profile.username : shownName;

  async function run(kind, action, message) {
    setBusy(kind);
    try {
      const result = await action();
      onChange(result.profile);
      if (kind === "nick") setNick(result.profile.nick ?? "");
      toast(message);
    }
    catch (err) {
      toast(err.message, "error");
    }
    finally {
      setBusy(null);
    }
  }

  const saveNick = (value) => run("nick", () => api.patch(`/guilds/${data.guild.id}/profile`, { nick: value }), value ? `Phoenix is now called ${value} here.` : "Reset Phoenix's nickname.");

  function upload(file) {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return toast("The avatar has to be a PNG, JPEG, GIF or WebP image.", "error");
    if (file.size > 8 * 1024 * 1024) return toast("The avatar can be at most 8 MB.", "error");
    return run("avatar", () => api.upload(`/guilds/${data.guild.id}/profile/avatar`, file, file.type), "Updated Phoenix's avatar in this server.");
  }

  return (
    <>
      <div className="profile-grid">
        <section className="panel">
          <h3>Nickname</h3>
          <p>What Phoenix is called in this server. Leave it empty to use “{profile.username}”.</p>
          <form
            className="inline"
            onSubmit={(e) => {
              e.preventDefault();
              saveNick(nick.trim());
            }}
          >
            <label className="visually-hidden" htmlFor="bot-nick">Nickname</label>
            <input id="bot-nick" className="input" maxLength={32} placeholder={profile.username} value={nick} onChange={(e) => setNick(e.target.value)} />
            <button type="submit" className="button primary" disabled={busy !== null || nick.trim() === (profile.nick ?? "")}>
              {busy === "nick" ? "Saving..." : "Save"}
            </button>
          </form>
          <div className="char-count">{nick.length} / 32</div>
          {profile.nick && <button type="button" className="button quiet small" disabled={busy !== null} onClick={() => saveNick("")}>Reset nickname</button>}
        </section>

        <section className="panel">
          <h3>Server avatar</h3>
          <p>A picture Phoenix uses only in this server. GIFs stay animated.</p>
          <div className="avatar-edit">
            <img className="avatar-large" src={shownAvatar} alt="Phoenix's avatar in this server" width={96} height={96} />
            <div className="inline">
              <label className="button" style={{ flex: "none" }}>
                {busy === "avatar" ? "Uploading..." : "Upload image"}
                <input
                  type="file"
                  accept={IMAGE_TYPES.join(",")}
                  className="visually-hidden"
                  disabled={busy !== null}
                  onChange={(e) => {
                    upload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              {profile.avatar && (
                <button type="button" className="button danger" disabled={busy !== null} onClick={() => run("avatar", () => api.delete(`/guilds/${data.guild.id}/profile/avatar`), "Phoenix uses its normal avatar here again.")}>
                  Remove
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="panel">
        <h3>How it looks</h3>
        <p>Phoenix's messages and server logs use this name and avatar.</p>
        <div className="discord-preview">
          <div className="discord-message">
            <img src={shownAvatar} alt="" width={40} height={40} />
            <div>
              <div className="discord-author">{shownName} <span className="app-tag">APP</span></div>
              <div className="discord-embed" style={{ borderColor: "#ff8a3d" }}>
                <div className="discord-embed-title">Message deleted</div>
                <div>A message by <span className="mention">@someone</span> was deleted in <span className="mention">#general</span>.</div>
              </div>
            </div>
          </div>
        </div>
        {webhookName !== shownName && (
          <p className="field-help">Discord doesn't allow “discord” or “clyde” in webhook names, so log messages will use “{profile.username}”.</p>
        )}
      </section>
    </>
  );
}
