// Supabase Edge Function: clever-action
// Fetches cricket match data from CricAPI, transforms the response,
// and returns structured { live: [...], upcoming: [...] } JSON.
//
// Deploy with:
//   supabase functions deploy clever-action
//
// Set the API key secret:
//   supabase secrets set CRIC_API_KEY=76e4e258-7898-4311-ace0-4196d49df2b7

const CACHE_TTL_MS = 7 * 60 * 1000; // 7 minutes

interface MatchItem {
  id: string;
  name: string;
  status: string;
  venue?: string;
  teams: string[];
  score?: Array<{ r: number; w: number; o: number; inning: string }>;
  matchStarted: boolean;
  matchEnded: boolean;
  dateTimeGMT?: string;
}

interface CachedData {
  data: { live: MatchItem[]; upcoming: MatchItem[] };
  cachedAt: number;
}

// Module-level cache (persists across warm invocations)
let cache: CachedData | null = null;

function isCacheValid(): boolean {
  return cache !== null && Date.now() - cache.cachedAt < CACHE_TTL_MS;
}

function normalizeMatch(raw: Record<string, unknown>): MatchItem {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    status: String(raw.status ?? ""),
    venue: raw.venue ? String(raw.venue) : undefined,
    teams: Array.isArray(raw.teams) ? (raw.teams as string[]) : [],
    score: Array.isArray(raw.score)
      ? (raw.score as Array<{ r: number; w: number; o: number; inning: string }>)
      : [],
    matchStarted: Boolean(raw.matchStarted),
    matchEnded: Boolean(raw.matchEnded),
    dateTimeGMT: raw.dateTimeGMT ? String(raw.dateTimeGMT) : undefined,
  };
}

Deno.serve(async (_req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Content-Type": "application/json",
  };

  // Handle preflight
  if (_req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Serve from cache if still valid
  if (isCacheValid()) {
    return new Response(
      JSON.stringify(cache!.data),
      { status: 200, headers: corsHeaders },
    );
  }

  const apiKey = Deno.env.get("CRIC_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ status: "error", message: "API key not configured." }),
      { status: 500, headers: corsHeaders },
    );
  }

  try {
    const res = await fetch(
      `https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`,
      { signal: AbortSignal.timeout(12000) },
    );

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: `CricAPI returned HTTP ${res.status}`,
        }),
        { status: 502, headers: corsHeaders },
      );
    }

    const json = await res.json() as Record<string, unknown>;

    // Check CricAPI status field
    const apiStatus = String(json.status ?? "").toLowerCase();
    if (apiStatus === "failure" || apiStatus === "error") {
      const msg = String(
        (json.message as string | undefined) ?? "CricAPI request failed",
      );
      return new Response(
        JSON.stringify({ status: "failure", message: msg }),
        { status: 200, headers: corsHeaders },
      );
    }

    const rawData = Array.isArray(json.data)
      ? (json.data as Record<string, unknown>[])
      : [];

    // ── Transform: extract only required fields, separate live vs upcoming ──
    const live: MatchItem[] = [];
    const upcoming: MatchItem[] = [];

    for (const raw of rawData) {
      if (Boolean(raw.matchEnded)) continue; // skip finished matches

      const match = normalizeMatch(raw);

      if (match.matchStarted) {
        live.push(match);
      } else {
        upcoming.push(match);
      }
    }

    const structured = { live, upcoming };

    // Update cache
    cache = { data: structured, cachedAt: Date.now() };

    return new Response(
      JSON.stringify(structured),
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ status: "error", message: msg }),
      { status: 500, headers: corsHeaders },
    );
  }
});
