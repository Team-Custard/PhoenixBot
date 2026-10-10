// Small wrapper around fetch for the dashboard API (web/api.js on the server).

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message ?? `Request failed (${status})`);
    this.status = status;
    this.body = body ?? {};
  }
}

async function request(method, path, body) {
  const response = await fetch(`/api/dashboard${path}`, {
    method,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      // Required by the server for anything that changes data (CSRF protection).
      ...(method !== "GET" ? { "X-Phoenix-Dashboard": "1" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data);
  return data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body = {}) => request("POST", path, body),
  put: (path, body) => request("PUT", path, body),
  patch: (path, body) => request("PATCH", path, body),
  delete: (path) => request("DELETE", path),
};

export const loginUrl = (next = window.location.pathname) => `/dash/login?next=${encodeURIComponent(next)}`;

export function guildIcon(guild, size = 128) {
  if (!guild?.icon) return null;
  const ext = guild.icon.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${ext}?size=${size}`;
}

export function userAvatar(user, size = 64) {
  if (!user?.avatar) return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(user?.id ?? 0) >> 22n) % 6n)}.png`;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`;
}
