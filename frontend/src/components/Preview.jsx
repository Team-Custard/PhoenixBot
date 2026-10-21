// Shows how a message with {{placeholders}} will look, with the logged-in person as
// the example member. Placeholders are highlighted. With a saved embed picked, it's
// drawn like Discord shows the message: text, then the embed.
import { Markdown } from "./Markdown.jsx";
import { sampleValues } from "../placeholders.js";
import { EmbedPreview, toEditor } from "../pages/EmbedBuilder.jsx";

// The verification panel isn't for one member, so member placeholders come out empty.
const NO_MEMBER = { mention: "", username: "", displayname: "", nickname: "", userid: "", avatar: "", serveravatar: "" };

/**
 * `panel`: preview it like the verification panel, where text without a saved embed
 * goes in an orange box and member placeholders are empty.
 */
export function MessagePreview({ text, data, me, extra = {}, embed = null, panel = false }) {
  const saved = embed ? (data?.embeds ?? []).find((e) => e.name === embed) : null;
  const fill = panel ? { ...extra, ...NO_MEMBER } : extra;
  if (saved) {
    return (
      <>
        <div className="preview-label">Preview</div>
        <EmbedPreview embed={toEditor(saved.data)} data={data} content={text} me={me} extra={fill} />
      </>
    );
  }
  if (panel) {
    return (
      <>
        <div className="preview-label">Preview</div>
        <EmbedPreview embed={toEditor({ color: 0xe67e22, description: text || "Press the button below to verify and get access to the server." })} data={data} me={me} extra={fill} />
      </>
    );
  }
  if (!text) return null;
  const values = sampleValues(data, me, extra);
  return (
    <>
      <div className="preview-label">Preview</div>
      <div className="preview">
        <Markdown text={text} ctx={{ channels: data?.channels, roles: data?.roles, values, userName: (id) => (id === me?.id ? me.globalName || me.username : "user") }} />
      </div>
    </>
  );
}
