// ─── Cricket API via Backend Proxy ───────────────────────────────────────────
// All CricketData API requests are routed through the Motoko backend canister
// using HTTP outcalls. The API key never touches the browser.
import { createActorWithConfig } from "../config";

// ─── Cache (in-memory, 8-minute TTL) ─────────────────────────────────────────
// Prevents multiple renders / manual refreshes from hammering the canister.
const CACHE_TTL_MS = 8 * 60 * 1000; // 8 minutes

interface CacheEntry {
  data: ApiMatch[];
  fetchedAt: number;
}

let _cache: CacheEntry | null = null;

export function getCacheAge(): number | null {
  if (!_cache) return null;
  return Math.floor((Date.now() - _cache.fetchedAt) / 1000);
}

export function isCacheValid(): boolean {
  return !!_cache && Date.now() - _cache.fetchedAt < CACHE_TTL_MS;
}

export function getCachedMatches(): ApiMatch[] | null {
  if (!isCacheValid()) return null;
  return _cache!.data;
}

export function clearCache(): void {
  _cache = null;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ApiScore {
  r: number;
  w: number;
  o: number;
  inning: string;
}

export interface ApiMatch {
  id: string;
  name: string;
  status: string;
  venue?: string;
  teams: string[];
  score?: ApiScore[];
  matchStarted: boolean;
  matchEnded: boolean;
  dateTimeGMT?: string;
}

interface ApiResponse {
  data: ApiMatch[];
  status: string;
  message?: string;
  info?: unknown;
  error?: string;
}

export type FetchResult =
  | { ok: true; matches: ApiMatch[]; fromCache: boolean; fetchedAt: number }
  | { ok: false; errorMessage: string; isQuota: boolean };

function resolveApiErrorMessage(json: ApiResponse): string {
  const raw = (json.message ?? json.error ?? "").toLowerCase();
  if (
    raw.includes("quota") ||
    raw.includes("limit") ||
    raw.includes("exceed")
  ) {
    return "API quota exceeded. The daily limit has been reached. Matches will load again after midnight.";
  }
  if (
    raw.includes("invalid") ||
    raw.includes("key") ||
    raw.includes("auth") ||
    raw.includes("unauthorized")
  ) {
    return "Invalid API key. Please verify the key is active at cricapi.com.";
  }
  const display = json.message ?? json.error ?? json.status ?? "Unknown error";
  return `API error: ${display}`;
}

// ─── Main fetch (cache-first, via backend canister) ───────────────────────────
// fetchMatchesWithCache() is the single entry point for all match data.
// It never calls CricketData API directly — the canister does that securely.
export async function fetchMatchesWithCache(
  forceRefresh = false,
): Promise<FetchResult> {
  // Serve from cache unless forced or stale
  if (!forceRefresh && isCacheValid()) {
    return {
      ok: true,
      matches: _cache!.data,
      fromCache: true,
      fetchedAt: _cache!.fetchedAt,
    };
  }

  try {
    const actor = await createActorWithConfig();
    const rawJson = await actor.fetchCricketMatches();

    const json: ApiResponse = JSON.parse(rawJson);

    if (json.status === "failure") {
      const errorMessage = resolveApiErrorMessage(json);
      const isQuota =
        errorMessage.toLowerCase().includes("quota") ||
        errorMessage.toLowerCase().includes("midnight");
      return { ok: false, errorMessage, isQuota };
    }

    const knownSuccess = ["success", "ok"].includes(
      (json.status ?? "").toLowerCase(),
    );
    if (!knownSuccess && !json.data) {
      return {
        ok: false,
        errorMessage: `Unexpected API response: ${json.status}`,
        isQuota: false,
      };
    }

    const all = (json.data ?? []).filter((m) => !m.matchEnded);
    const fetchedAt = Date.now();
    _cache = { data: all, fetchedAt };

    return { ok: true, matches: all, fromCache: false, fetchedAt };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, errorMessage: `Error: ${msg}`, isQuota: false };
  }
}
