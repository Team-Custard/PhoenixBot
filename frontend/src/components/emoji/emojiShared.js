// Small pieces shared by the emoji picker and the fields that open it. Kept apart
// so the picker itself can load on demand.
import { createContext } from "react";

/** The server's custom emojis Phoenix can use (the guild payload's `emojis`). */
export const ServerEmojis = createContext(null);

export const customEmojiText = (e) => `<${e.animated ? "a" : ""}:${e.name}:${e.id}>`;
export const customEmojiUrl = (id, animated, size = 48) => `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "webp"}?size=${size}&quality=lossless`;
const CUSTOM = /^<(a?):(\w{2,32}):(\d{17,20})>$/;
export function parseCustom(text) {
  const match = CUSTOM.exec(text ?? "");
  return match ? { animated: match[1] === "a", name: match[2], id: match[3] } : null;
}

