const { container } = require("@sapphire/framework");

// Logging used to call channel.fetchWebhooks() on every single logged event, which is
// an API request each time. Webhooks are now cached per channel and only refetched
// when the cache entry expires, the channel's webhooks change (webhooksUpdate event),
// or a send fails because the webhook was deleted.
const CACHE_TTL = 60 * 60 * 1000;
const cache = new Map();

async function createWebhook(channel) {
  return channel
    .createWebhook({
      name: "PhoenixBot",
      avatar: "https://phoenix.sylveondev.xyz/phoenixlogo.png",
      reason: "Creating webhook for logging",
    })
    .then((webhook) => {
      console.log(`Created webhook ${webhook.name} in ${channel.id} successfully`);
      return webhook;
    })
    .catch((err) => {
      console.error(`[error] Error creating webhook in ${channel.id}`, err);
      return undefined;
    });
}

async function resolve(channel) {
  if (!channel?.id) channel = await container.client.channels.fetch(channel).catch(() => undefined);
  if (!channel?.fetchWebhooks) return undefined;
  const webhooks = await channel.fetchWebhooks().catch(() => undefined);
  if (!webhooks) return undefined;
  // Only webhooks this bot created come back with a token we can use.
  const webhook = webhooks.find((wh) => wh.token);
  if (webhook) return webhook;
  console.log(`No webhook found for ${channel.id}. Attempting to create.`);
  return createWebhook(channel);
}

/**
 * Finds (or creates) a webhook owned by the bot in a channel.
 * @param {import("discord.js").GuildTextBasedChannel | string} channel A channel or channel id.
 */
exports.find = async (channel) => {
  const id = typeof channel === "string" ? channel : channel?.id;
  if (!id) return undefined;

  const cached = cache.get(id);
  if (cached && cached.expires > Date.now()) {
    const webhook = await cached.promise;
    if (webhook) return webhook;
  }

  const promise = resolve(channel).catch((err) => {
    console.error(`[error] Error occured in webhook handler`, err);
    return undefined;
  });
  cache.set(id, { promise, expires: Date.now() + CACHE_TTL });
  const webhook = await promise;
  if (!webhook) cache.delete(id);
  return webhook;
};

/**
 * Sends a payload through the channel's webhook, refreshing the cached webhook once
 * if Discord says it no longer exists.
 */
exports.send = async (channel, payload) => {
  const id = typeof channel === "string" ? channel : channel?.id;
  for (let attempt = 0; attempt < 2; attempt++) {
    const webhook = await exports.find(channel);
    if (!webhook) return undefined;
    try {
      return await webhook.send(payload);
    }
    catch (err) {
      // 10015 = Unknown Webhook
      if (err?.code === 10015 && attempt === 0) {
        cache.delete(id);
        continue;
      }
      console.error(`[error] Failed to send webhook message in ${id}`, err);
      return undefined;
    }
  }
  return undefined;
};

/** Forget the cached webhook for a channel. */
exports.invalidate = (channelId) => cache.delete(channelId);
