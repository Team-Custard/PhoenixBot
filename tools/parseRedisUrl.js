/**
 * Parses the `redisurl` environment variable (redis://user:password@host:port) into
 * the connection options BullMQ wants.
 * @returns {{ host: string, port: number, password?: string, username?: string }}
 */
exports.parse = () => {
  const raw = process.env["redisurl"];
  if (!raw) throw new Error("The redisurl environment variable is not set.");
  const url = new URL(raw);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : process.env["redispass"] || undefined,
  };
};
