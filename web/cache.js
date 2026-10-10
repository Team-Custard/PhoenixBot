/** A tiny in-memory cache with per-entry expiry, for Discord API lookups. */
class TtlCache {
  constructor(ttlMs, maxSize = 5_000) {
    this.ttl = ttlMs;
    this.maxSize = maxSize;
    this.map = new Map();
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expires < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value, ttl = this.ttl) {
    if (this.map.size >= this.maxSize) this.map.delete(this.map.keys().next().value);
    this.map.set(key, { value, expires: Date.now() + ttl });
    return value;
  }

  delete(key) {
    this.map.delete(key);
  }

  /** Returns the cached value or computes it (concurrent callers share one request). */
  async wrap(key, fn, ttl) {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const promise = Promise.resolve().then(fn);
    this.set(key, promise, ttl);
    try {
      const value = await promise;
      this.set(key, value, ttl);
      return value;
    }
    catch (err) {
      this.delete(key);
      throw err;
    }
  }
}

module.exports = { TtlCache };
