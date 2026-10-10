// Small wrapper around fetch for the dashboard API (web/api.js on the server).

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message ?? `Request failed (${status})`);
    this.status = status;
    this.body = body ?? {};
  }
}

async function request(method, path, body, { contentType } = {}) {
  const raw = body instanceof Blob;
  const response = await fetch(`/api/dashboard${path}`, {
    method,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": contentType ?? (raw ? body.type : "application/json") } : {}),
      // Required by the server for anything that changes data (CSRF protection).
      ...(method !== "GET" ? { "X-Phoenix-Dashboard": "1" } : {}),
    },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, data ?? { message: `The server answered with an error (${response.status}). Try again in a moment.` });
  }
  return data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body = {}) => request("POST", path, body),
  put: (path, body) => request("PUT", path, body),
  patch: (path, body) => request("PATCH", path, body),
  delete: (path, body) => request("DELETE", path, body),
  /** Sends a file as the raw request body. */
  upload: (path, file, contentType) => request("PUT", path, file, { contentType }),
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
