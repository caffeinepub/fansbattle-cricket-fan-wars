// ─── CricAPI Configuration ───────────────────────────────────────────────────
// Updated to paid plan key — do NOT call the API directly from multiple places.
// All calls must go through fetchMatchesWithCache() to respect the cache.
export const CRICKET_API_KEY = "76e4e258-7898-4311-ace0-4196d49df2b7";

const API_BASE = "https://api.cricapi.com/v1";

// ─── Cache (in-memory, 8-minute TTL) ─────────────────────────────────────────
// Prevents multiple users / tab re-renders from hammering the paid quota.
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

// ─── Main fetch (cache-first) ─────────────────────────────────────────────────
// NOTE: This is a temporary direct-fetch approach. When the backend proxy
// (Motoko HTTP outcall) is ready, replace the fetch() call below with a
// call to the canister endpoint and the cache will still work identically.
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    let res: Response;
    try {
      res = await fetch(
        `${API_BASE}/currentMatches?apikey=${CRICKET_API_KEY}&offset=0`,
        { signal: controller.signal },
      );
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      const msg =
        fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      const isCors =
        msg.toLowerCase().includes("cors") ||
        msg.toLowerCase().includes("failed to fetch") ||
        msg.toLowerCase().includes("network");
      return {
        ok: false,
        errorMessage: isCors
          ? "Network error — check your internet connection."
          : `Network error: ${msg}`,
        isQuota: false,
      };
    }
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        ok: false,
        errorMessage: `HTTP error ${res.status}`,
        isQuota: false,
      };
    }

    const json: ApiResponse = await res.json();

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
    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        errorMessage: "Request timed out. Check your connection.",
        isQuota: false,
      };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, errorMessage: `Error: ${msg}`, isQuota: false };
  }
}
