// Shows how a message with {{placeholders}} will look, using the logged-in user as
// the example member.

const TOKEN = /\{\{(.*?)\}\}/g;

export function MessagePreview({ text, user, guild, extra = {} }) {
  if (!text) return null;
  const name = user?.globalName || user?.username || "member";
  const values = {
    username: user?.username ?? "member",
    displayname: name,
    nickname: name,
    userid: user?.id ?? "0",
    membercount: "1,024",
    servername: guild?.name ?? "your server",
    ...extra,
  };

  const parts = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    parts.push(text.slice(last, match.index));
    const token = match[1].trim();
    if (token === "mention") parts.push(<span className="mention" key={match.index}>@{name}</span>);
    else parts.push(values[token] ?? match[0]);
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last));

  return (
    <>
      <div className="preview-label">Preview</div>
      <div className="preview">{parts}</div>
    </>
  );
}
