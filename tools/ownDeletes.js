// Messages Phoenix deletes itself as part of normal work (an old sticky message, for
// example), so the message log doesn't report them as "a message was deleted".
const recent = new Map();

function rememberOwnDelete(messageId) {
  recent.set(messageId, Date.now());
  if (recent.size > 5_000) {
    const cutoff = Date.now() - 60_000;
    for (const [id, at] of recent) if (at < cutoff) recent.delete(id);
  }
}

/** True (once) if Phoenix deleted this message itself in the last minute. */
function wasOwnDelete(messageId) {
  const at = recent.get(messageId);
  if (!at) return false;
  recent.delete(messageId);
  return Date.now() - at < 60_000;
}

module.exports = { rememberOwnDelete, wasOwnDelete };
