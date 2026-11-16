// The platforms the notifications module can watch. Each one knows how to tidy up
// what people type as the account (normalize, no network) and how to check an
// account for new posts or a live stream (check, with network).
//
// check(feed) gets the stored feed (see tools/models/NotificationFeed.js) and returns
//   { name, resolvedId, items: [{ id, kind: "upload"|"post", title, link, thumbnail }],
//     live: { id, title, link, thumbnail, game } | null | undefined }
// `live` undefined means the platform doesn't do live streams (or can't tell).
const dns = require("node:dns").promises;
const net = require("node:net");
const { request, getJson, getText } = require("../http");
const { parseFeed } = require("./feedParser");

class AccountError extends Error {}

const twitchAuth = { token: null, expires: 0 };

function env(name) {
  return process.env[name] || null;
}

/** Strips a link down to its path parts, or returns null if it isn't a link to `hosts`. */
function pathOf(input, hosts) {
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    if (!hosts.includes(url.hostname.replace(/^(www|m|mobile)\./, ""))) return null;
    return url.pathname.split("/").filter(Boolean);
  }
  catch {
    return null;
  }
}

const youtube = {
  label: "YouTube",
  events: ["live", "upload"],
  interval: 5 * 60_000,
  normalize(input) {
    let text = input.trim();
    const parts = pathOf(text, ["youtube.com"]);
    if (parts) {
      if (parts[0]?.startsWith("@")) text = parts[0];
      else if (parts[0] === "channel" && parts[1]) text = parts[1];
      else throw new AccountError("Use the channel's @handle or its /channel/ link.");
    }
    if (/^UC[\w-]{22}$/.test(text)) return text;
    const handle = text.startsWith("@") ? text : `@${text}`;
    if (!/^@[\w.-]{3,30}$/.test(handle)) throw new AccountError("That doesn't look like a YouTube @handle.");
    return handle.toLowerCase();
  },
  /** Turns an @handle into the channel id (UC...), which the feed needs. */
  async resolve(account) {
    if (account.startsWith("UC")) return account;
    const html = await getText(`https://www.youtube.com/${encodeURIComponent(account)}`, {
      // Skips the cookie consent page YouTube shows in some countries.
      headers: { Cookie: "SOCS=CAI; CONSENT=YES+1", "Accept-Language": "en" },
    });
    const id = /<meta itemprop="identifier" content="(UC[\w-]{22})"/.exec(html)?.[1]
      ?? /"externalId":"(UC[\w-]{22})"/.exec(html)?.[1]
      ?? /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/.exec(html)?.[1];
    if (!id) throw new AccountError("Couldn't find that YouTube channel.");
    return id;
  },
  async check(feed) {
    const channelId = feed.resolvedId ?? await this.resolve(feed.account);
    const xml = await getText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    const parsed = parseFeed(xml);
    const items = parsed.items.slice(0, 15).map((i) => ({
      id: i.videoId || i.id,
      kind: "upload",
      title: i.title,
      link: i.link || `https://www.youtube.com/watch?v=${i.videoId}`,
      thumbnail: i.thumbnail || (i.videoId ? `https://i.ytimg.com/vi/${i.videoId}/hqdefault.jpg` : ""),
    }));
    return { name: parsed.title || feed.name, resolvedId: channelId, items };
  },
  /**
   * With a Google API key (googlekey in .env), tells live streams and scheduled
   * streams apart from uploads. Costs 1 unit of quota per call.
   * @returns {Promise<Map<string, { state: "live"|"upcoming"|"none", title: string }>|null>}
   */
  async videoStates(ids) {
    const key = env("googlekey");
    if (!key || !ids.length) return null;
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ids.slice(0, 50).join(",")}&key=${encodeURIComponent(key)}`;
    const data = await getJson(url);
    return new Map((data.items ?? []).map((v) => [v.id, { state: v.snippet?.liveBroadcastContent ?? "none", title: v.snippet?.title ?? "" }]));
  },
};

const twitch = {
  label: "Twitch",
  events: ["live"],
  interval: 2 * 60_000,
  available: () => Boolean(env("TWITCH_CLIENT_ID") && env("TWITCH_CLIENT_SECRET")),
  unavailable: "Twitch notifications need TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in the bot's .env.",
  normalize(input) {
    const parts = pathOf(input.trim(), ["twitch.tv"]);
    const name = (parts ? parts[0] : input.trim()).replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9_]{3,25}$/.test(name)) throw new AccountError("That doesn't look like a Twitch username.");
    return name;
  },
  async token() {
    if (twitchAuth.token && twitchAuth.expires > Date.now() + 60_000) return twitchAuth.token;
    const params = new URLSearchParams({ client_id: env("TWITCH_CLIENT_ID"), client_secret: env("TWITCH_CLIENT_SECRET"), grant_type: "client_credentials" });
    const response = await request(`https://id.twitch.tv/oauth2/token?${params}`, { method: "POST" });
    const data = await response.json();
    twitchAuth.token = data.access_token;
    twitchAuth.expires = Date.now() + (data.expires_in ?? 3600) * 1000;
    return twitchAuth.token;
  },
  async helix(path, retried = false) {
    const token = await this.token();
    return getJson(`https://api.twitch.tv/helix/${path}`, { headers: { "Client-Id": env("TWITCH_CLIENT_ID"), Authorization: `Bearer ${token}` } })
      .catch((err) => {
        // The token was revoked or expired early: get a new one and try once more.
        if (err.status === 401 && !retried) {
          twitchAuth.token = null;
          return this.helix(path, true);
        }
        throw err;
      });
  },
  /** Checks up to 100 accounts in one request. Returns login -> result. */
  async checkMany(feeds) {
    const logins = feeds.map((f) => f.account);
    const query = (key) => logins.map((l) => `${key}=${encodeURIComponent(l)}`).join("&");
    const [users, streams] = await Promise.all([this.helix(`users?${query("login")}`), this.helix(`streams?${query("user_login")}&first=100`)]);
    const results = new Map();
    for (const login of logins) {
      const user = users.data?.find((u) => u.login === login);
      if (!user) {
        results.set(login, { error: "Couldn't find that Twitch account." });
        continue;
      }
      const stream = streams.data?.find((s) => s.user_login === login && s.type === "live");
      results.set(login, {
        name: user.display_name,
        resolvedId: user.id,
        items: [],
        live: stream
          ? {
            id: stream.id,
            title: stream.title,
            game: stream.game_name,
            link: `https://www.twitch.tv/${login}`,
            thumbnail: stream.thumbnail_url?.replace("{width}", "1280").replace("{height}", "720") ?? "",
          }
          : null,
      });
    }
    return results;
  },
  async check(feed) {
    const result = (await this.checkMany([feed])).get(feed.account);
    if (result.error) throw new AccountError(result.error);
    return result;
  },
};

const bluesky = {
  label: "Bluesky",
  events: ["post"],
  interval: 5 * 60_000,
  normalize(input) {
    const parts = pathOf(input.trim(), ["bsky.app"]);
    const handle = (parts && parts[0] === "profile" ? parts[1] : input.trim()).replace(/^@/, "").toLowerCase();
    if (/^did:plc:[a-z0-9]{24}$/.test(handle)) return handle;
    const full = handle.includes(".") ? handle : `${handle}.bsky.social`;
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(full) || full.length > 253) throw new AccountError("That doesn't look like a Bluesky handle.");
    return full;
  },
  async check(feed) {
    const data = await getJson(`https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(feed.account)}&filter=posts_no_replies&limit=15`)
      .catch((err) => {
        if (err.status === 400) throw new AccountError("Couldn't find that Bluesky account.");
        throw err;
      });
    const own = (data.feed ?? []).filter((entry) => !entry.reason && entry.post);
    const first = own[0]?.post?.author;
    const items = own.map(({ post }) => {
      const rkey = post.uri.split("/").pop();
      const image = post.embed?.images?.[0]?.thumb ?? post.embed?.media?.images?.[0]?.thumb ?? post.embed?.external?.thumb ?? "";
      return {
        id: post.uri,
        kind: "post",
        title: String(post.record?.text ?? "").slice(0, 200),
        link: `https://bsky.app/profile/${post.author.handle}/post/${rkey}`,
        thumbnail: image,
      };
    });
    return { name: first?.displayName || first?.handle || feed.name || feed.account, resolvedId: first?.did, items };
  },
};

const x = {
  label: "X (Twitter)",
  events: ["post"],
  // X's API allows very few requests on its cheaper plans.
  interval: 15 * 60_000,
  available: () => Boolean(env("X_BEARER_TOKEN")),
  unavailable: "X notifications need an X API bearer token (X_BEARER_TOKEN) in the bot's .env.",
  normalize(input) {
    const parts = pathOf(input.trim(), ["x.com", "twitter.com"]);
    const name = (parts ? parts[0] : input.trim()).replace(/^@/, "");
    if (!/^\w{1,15}$/.test(name)) throw new AccountError("That doesn't look like an X username.");
    return name.toLowerCase();
  },
  async api(path) {
    return getJson(`https://api.x.com/2/${path}`, { headers: { Authorization: `Bearer ${env("X_BEARER_TOKEN")}` } });
  },
  async check(feed) {
    let id = feed.resolvedId;
    let name = feed.name;
    if (!id) {
      const user = await this.api(`users/by/username/${encodeURIComponent(feed.account)}`);
      if (!user.data) throw new AccountError("Couldn't find that X account.");
      id = user.data.id;
      name = user.data.name;
    }
    const posts = await this.api(`users/${id}/tweets?max_results=5&exclude=replies,retweets`);
    const items = (posts.data ?? []).map((p) => ({ id: p.id, kind: "post", title: String(p.text ?? "").slice(0, 200), link: `https://x.com/${feed.account}/status/${p.id}`, thumbnail: "" }));
    return { name: name || feed.account, resolvedId: id, items };
  },
};

const reddit = {
  label: "Reddit",
  events: ["post"],
  interval: 10 * 60_000,
  normalize(input) {
    const parts = pathOf(input.trim(), ["reddit.com", "old.reddit.com"]);
    let text = input.trim();
    if (parts) text = `${parts[0]}/${parts[1] ?? ""}`;
    const match = /^\/?(r|u|user)\/([\w-]{2,30})\/?$/i.exec(text);
    if (match) return `${match[1].toLowerCase() === "r" ? "r" : "u"}/${match[2].toLowerCase()}`;
    if (/^[\w-]{2,30}$/.test(text)) return `r/${text.toLowerCase()}`;
    throw new AccountError("Use a subreddit like r/aww or a user like u/spez.");
  },
  async check(feed) {
    const [type, name] = feed.account.split("/");
    const path = type === "r" ? `r/${name}/new` : `user/${name}/submitted`;
    const data = await getJson(`https://www.reddit.com/${path}.json?limit=15&raw_json=1`)
      .catch((err) => {
        if (err.status === 404 || err.status === 403) throw new AccountError("Couldn't find that subreddit or user (or it's private).");
        throw err;
      });
    const items = (data.data?.children ?? []).map(({ data: post }) => ({
      id: post.name,
      kind: "post",
      title: String(post.title ?? "").slice(0, 200),
      link: `https://www.reddit.com${post.permalink}`,
      thumbnail: /^https:\/\//.test(post.thumbnail ?? "") ? post.thumbnail : "",
    }));
    return { name: feed.account, items };
  },
};

const rss = {
  label: "RSS feed",
  events: ["post"],
  interval: 10 * 60_000,
  normalize(input) {
    let url;
    try {
      url = new URL(input.trim());
    }
    catch {
      throw new AccountError("Give the feed's full link, starting with https://");
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new AccountError("Feeds have to be http or https links.");
    // No feeds on the bot's own machine or network.
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[)/i.test(url.hostname) || !url.hostname.includes(".")) {
      throw new AccountError("That feed's address isn't allowed.");
    }
    return url.href;
  },
  async check(feed) {
    const parsed = parseFeed(await fetchPublicText(feed.account, { headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" } }));
    if (!parsed.items.length && !parsed.title) throw new AccountError("That link isn't an RSS or Atom feed.");
    // Some feeds list oldest first; go by date when items have one.
    const time = (i) => Date.parse(i.published) || 0;
    if (parsed.items.every((i) => time(i))) parsed.items.sort((a, b) => time(b) - time(a));
    const items = parsed.items.slice(0, 15).map((i) => ({ id: i.id, kind: "post", title: i.title.slice(0, 200), link: i.link, thumbnail: i.thumbnail }));
    return { name: parsed.title || feed.account, items };
  },
};

/** Whether an IP address is on the bot's own machine or a private network. */
function privateAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, "");
  // IPv4 inside IPv6 (::ffff:10.0.0.1, ::10.0.0.1, NAT64 64:ff9b::10.0.0.1).
  const embedded = /^(?:::ffff:|::|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (embedded) return privateAddress(embedded[1]);
  if (lower.startsWith("64:ff9b:")) return true;
  return lower === "::1" || lower === "::" || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower) || /^::ffff:/.test(lower);
}

/** DNS lookup for feed requests that refuses private addresses, checked as the connection is made. */
function publicLookup(hostname, options, callback) {
  dns.lookup(hostname, { ...options, all: true }).then((addresses) => {
    if (!addresses.length || addresses.some((a) => privateAddress(a.address))) {
      callback(Object.assign(new AccountError("That feed's address isn't allowed."), { code: "EPRIVATE" }));
      return;
    }
    if (options?.all) callback(null, addresses);
    else callback(null, addresses[0].address, addresses[0].family);
  }, (err) => callback(err));
}

let feedAgent = null;
const MAX_FEED_BYTES = 2 * 1024 * 1024;

/**
 * Fetches a feed someone typed in, refusing addresses on the bot's own network (the
 * address is checked when connecting, also after redirects), and at most 2 MB of it.
 */
async function fetchPublicText(link, options = {}) {
  const { Agent, fetch: undiciFetch } = require("undici");
  feedAgent ??= new Agent({ connect: { lookup: publicLookup } });
  let url = new URL(link);
  for (let hop = 0; hop < 4; hop++) {
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new AccountError("Feeds have to be http or https links.");
    // Addresses typed as numbers skip DNS, so check those here.
    if (net.isIP(url.hostname.replace(/^\[|\]$/g, "")) && privateAddress(url.hostname)) throw new AccountError("That feed's address isn't allowed.");
    const response = await undiciFetch(url.href, {
      dispatcher: feedAgent,
      redirect: "manual",
      headers: { "User-Agent": "PhoenixBot (https://phoenix.sylveondev.xyz)", ...(options.headers ?? {}) },
      signal: AbortSignal.timeout(15_000),
    }).catch((err) => {
      throw err.cause instanceof AccountError ? err.cause : err;
    });
    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      await response.body?.cancel().catch(() => undefined);
      url = new URL(response.headers.get("location"), url);
      continue;
    }
    if (!response.ok) throw Object.assign(new Error(`Request failed: ${response.status}`), { status: response.status });
    // Read at most 2 MB.
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > MAX_FEED_BYTES) {
        await response.body.cancel().catch(() => undefined);
        throw new AccountError("That feed is too big (over 2 MB).");
      }
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString("utf8");
  }
  throw new AccountError("That feed redirects too many times.");
}

const PROVIDERS = { youtube, twitch, bluesky, x, reddit, rss };

/** The feed id for an account: "youtube:@phoenix". Throws AccountError for bad accounts. */
function feedKey(platform, account) {
  const provider = PROVIDERS[platform];
  if (!provider) throw new AccountError("Pick a platform.");
  return `${platform}:${provider.normalize(String(account ?? ""))}`;
}

module.exports = { PROVIDERS, AccountError, feedKey, privateAddress };
