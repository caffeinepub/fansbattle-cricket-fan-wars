// ─── Cricket API — direct frontend call ──────────────────────────────────────
// Calls CricAPI directly from the browser.
// API key is only used here; never stored elsewhere in the codebase.

const CRIC_API_KEY = "76e4e258-7898-4311-ace0-4196d49df2b7";
const CRIC_API_URL = `https://api.cricapi.com/v1/currentMatches?apikey=${CRIC_API_KEY}&offset=0`;

// ─── Cache (in-memory, 10-minute TTL) ────────────────────────────────────────
const CACHE_TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
  data: ApiMatch[];
  fetchedAt: number;
}

let _cache: CacheEntry | null = null;

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

export type FetchResult =
  | { ok: true; matches: ApiMatch[]; fromCache: boolean; fetchedAt: number }
  | { ok: false; errorMessage: string; isQuota: boolean };

function classifyError(message: string): {
  ok: false;
  errorMessage: string;
  isQuota: boolean;
} {
  const lower = message.toLowerCase();
  if (
    lower.includes("quota") ||
    lower.includes("limit") ||
    lower.includes("exceed")
  ) {
    return {
      ok: false,
      errorMessage:
        "API quota exceeded. Matches will load again after midnight.",
      isQuota: true,
    };
  }
  if (
    lower.includes("invalid") ||
    lower.includes("unauthorized") ||
    lower.includes("forbidden")
  ) {
    return {
      ok: false,
      errorMessage:
        "Invalid API key. Please verify the key is active at cricapi.com.",
      isQuota: false,
    };
  }
  if (
    lower.includes("network") ||
    lower.includes("unreachable") ||
    lower.includes("timeout") ||
    lower.includes("failed to fetch")
  ) {
    return {
      ok: false,
      errorMessage:
        "Could not connect to cricket data. Check your connection and try again.",
      isQuota: false,
    };
  }
  return {
    ok: false,
    errorMessage: `Match data unavailable: ${message}`,
    isQuota: false,
  };
}

function normalizeMatch(item: Record<string, unknown>): ApiMatch {
  return {
    id: String(item.id ?? ""),
    name: String(item.name ?? ""),
    status: String(item.status ?? ""),
    venue: item.venue ? String(item.venue) : undefined,
    teams: Array.isArray(item.teams) ? (item.teams as string[]) : [],
    score: Array.isArray(item.score)
      ? (item.score as Array<{
          r: number;
          w: number;
          o: number;
          inning: string;
        }>)
      : [],
    matchStarted: Boolean(item.matchStarted),
    matchEnded: Boolean(item.matchEnded),
    dateTimeGMT: item.dateTimeGMT ? String(item.dateTimeGMT) : undefined,
  };
}

// ─── Main fetch ───────────────────────────────────────────────────────────────
// Called ONLY on app load and when user clicks "Refresh Now".
// No polling / setInterval anywhere in the app.
export async function fetchMatchesWithCache(
  forceRefresh = false,
): Promise<FetchResult> {
  // Return cache if valid and not forcing refresh
  if (!forceRefresh && isCacheValid()) {
    return {
      ok: true,
      matches: _cache!.data,
      fromCache: true,
      fetchedAt: _cache!.fetchedAt,
    };
  }

  try {
    const response = await fetch(CRIC_API_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    let parsed: unknown;
    const text = await response.text();
    try {
      parsed = JSON.parse(text);
    } catch {
      return classifyError("Invalid response from server.");
    }

    if (!parsed || typeof parsed !== "object") {
      return {
        ok: false,
        errorMessage: "Unexpected response format.",
        isQuota: false,
      };
    }

    const obj = parsed as Record<string, unknown>;

    // CricAPI returns { status: "failure", message: ".." } on errors
    const status = String(obj.status ?? "").toLowerCase();
    if (status === "failure" || status === "error") {
      const msg = String(
        (obj.message as string | undefined) ??
          (obj.error as string | undefined) ??
          "Unknown error",
      );
      return classifyError(msg);
    }

    // CricAPI success: { status: "success", data: [...] }
    if (!Array.isArray(obj.data)) {
      return {
        ok: false,
        errorMessage: "No match data returned by API.",
        isQuota: false,
      };
    }

    const matches: ApiMatch[] = (obj.data as unknown[])
      .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
      .map(normalizeMatch)
      .filter((m) => !m.matchEnded);

    const fetchedAt = Date.now();
    _cache = { data: matches, fetchedAt };

    return { ok: true, matches, fromCache: false, fetchedAt };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return classifyError(msg);
  }
}
