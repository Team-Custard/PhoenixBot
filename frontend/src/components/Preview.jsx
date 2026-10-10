// Shows how a message with {{placeholders}} will look, with the logged-in person as
// the example member. Placeholders are highlighted.
import { Markdown } from "./Markdown.jsx";
import { sampleValues } from "../placeholders.js";

export function MessagePreview({ text, data, me, extra = {} }) {
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
