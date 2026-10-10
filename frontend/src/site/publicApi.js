// Fetch helpers for the public website (routers/public.js and routers/api.js).
import { useEffect, useState } from "react";

export async function getJson(path) {
  const response = await fetch(path, { headers: { Accept: "application/json" } });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message ?? `Request failed (${response.status})`);
    error.status = response.status;
    error.body = data ?? {};
    throw error;
  }
  return data;
}

/** Loads JSON once per path: { data, error, loading }. */
export function useJson(path) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) });
  useEffect(() => {
    if (!path) return undefined;
    let alive = true;
    setState({ data: null, error: null, loading: true });
    getJson(path)
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }));
    return () => {
      alive = false;
    };
  }, [path]);
  return state;
}

// Shared by the header (staging banner) and the home page (numbers).
let statsPromise = null;
export function useStats() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    statsPromise ??= getJson("/api/public/stats").catch(() => null);
    let alive = true;
    statsPromise.then((s) => alive && setStats(s));
    return () => {
      alive = false;
    };
  }, []);
  return stats;
}

export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · PhoenixBot` : "PhoenixBot — Now you're thinking with Discord bots";
  }, [title]);
}

export function formatNumber(n) {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  return n.toLocaleString();
}
