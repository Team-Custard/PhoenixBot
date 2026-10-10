import { useState } from "react";
import { api } from "../api.js";
import { useToast } from "../components/Toasts.jsx";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

export function BotProfile({ data, onChange }) {
  const toast = useToast();
  const profile = data.bot.profile;
  const [nick, setNick] = useState(profile.nick ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
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
      if (kind === "bio") setBio(result.profile.bio ?? "");
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

  const saveBio = (value) => run("bio", () => api.patch(`/guilds/${data.guild.id}/profile`, { bio: value }), value ? "Updated Phoenix's bio in this server." : "Removed Phoenix's server bio.");

  function upload(kind, file) {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return toast("The image has to be a PNG, JPEG, GIF or WebP file.", "error");
    if (file.size > 8 * 1024 * 1024) return toast("The image can be at most 8 MB.", "error");
    return run(kind, () => api.upload(`/guilds/${data.guild.id}/profile/${kind}`, file, file.type), `Updated Phoenix's ${kind} in this server.`);
  }

  const removeImage = (kind) => run(kind, () => api.delete(`/guilds/${data.guild.id}/profile/${kind}`), `Phoenix uses its normal ${kind} here again.`);

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
                    upload("avatar", e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              {profile.avatar && (
                <button type="button" className="button danger" disabled={busy !== null} onClick={() => removeImage("avatar")}>
                  Remove
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="profile-grid">
        <section className="panel">
          <h3>Server banner</h3>
          <p>Shown at the top of Phoenix's profile in this server. A wide image works best (about 600 × 240).</p>
          {profile.banner && <img className="banner-preview" src={profile.banner} alt="Phoenix's banner in this server" />}
          <div className="inline">
            <label className="button" style={{ flex: "none" }}>
              {busy === "banner" ? "Uploading..." : "Upload banner"}
              <input
                type="file"
                accept={IMAGE_TYPES.join(",")}
                className="visually-hidden"
                disabled={busy !== null}
                onChange={(e) => {
                  upload("banner", e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {profile.banner && <button type="button" className="button danger" disabled={busy !== null} onClick={() => removeImage("banner")}>Remove</button>}
          </div>
        </section>

        <section className="panel">
          <h3>Server bio</h3>
          <p>The "About me" people see on Phoenix's profile in this server.</p>
          <label className="visually-hidden" htmlFor="bot-bio">Bio</label>
          <textarea id="bot-bio" className="textarea" maxLength={190} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Your friendly server bot." />
          <div className="char-count">{bio.length} / 190</div>
          <div className="inline">
            <button type="button" className="button primary" disabled={busy !== null || bio.trim() === (profile.bio ?? "")} onClick={() => saveBio(bio.trim())}>
              {busy === "bio" ? "Saving..." : "Save bio"}
            </button>
            {profile.bio && <button type="button" className="button quiet small" disabled={busy !== null} onClick={() => saveBio("")}>Remove bio</button>}
          </div>
        </section>
      </div>

      <section className="panel">
        <h3>How it looks</h3>
        <p>Phoenix's messages and server logs use this name and avatar.</p>
        <div className="profile-mini" aria-label="Phoenix's profile in this server">
          <div className="profile-mini-banner" style={profile.banner ? { backgroundImage: `url(${profile.banner})` } : undefined} />
          <img src={shownAvatar} alt="" width={72} height={72} />
          <strong>{shownName}</strong>
          <span className="profile-mini-tag">{profile.username} <span className="app-tag">APP</span></span>
          {(bio.trim() || profile.bio) && <p>{bio.trim() || profile.bio}</p>}
        </div>
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
