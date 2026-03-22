import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { type ApiMatch, fetchMatchesWithCache } from "../../lib/cricketApi";

export type { ApiMatch };
export type { ApiScore } from "../../lib/cricketApi";

function formatScore(
  score?: Array<{ r: number; w: number; o: number; inning: string }>,
): { a: string; b: string } {
  if (!score || score.length === 0) return { a: "Yet to bat", b: "Yet to bat" };
  const a = score[0]
    ? `${score[0].r}/${score[0].w} (${score[0].o} ov)`
    : "Yet to bat";
  const b = score[1]
    ? `${score[1].r}/${score[1].w} (${score[1].o} ov)`
    : "Yet to bat";
  return { a, b };
}

function MatchCard({
  match,
  isLive,
  onSelect,
}: {
  match: ApiMatch;
  isLive: boolean;
  onSelect: () => void;
}) {
  const scores = formatScore(match.score);
  const team1 = match.teams?.[0] ?? "Team A";
  const team2 = match.teams?.[1] ?? "Team B";

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      className="text-left rounded-2xl p-4 transition-all"
      style={{
        width: "280px",
        minWidth: "280px",
        flexShrink: 0,
        scrollSnapAlign: "start",
        background: isLive
          ? "linear-gradient(135deg, oklch(0.18 0.05 220), oklch(0.14 0.03 255))"
          : "oklch(0.17 0.03 255)",
        border: `1px solid ${
          isLive ? "oklch(0.55 0.2 150 / 0.5)" : "oklch(0.25 0.04 255 / 0.6)"
        }`,
        boxShadow: isLive ? "0 0 16px oklch(0.55 0.2 150 / 0.18)" : "none",
      }}
    >
      {isLive && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="relative flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "oklch(0.65 0.2 150)" }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ background: "oklch(0.65 0.2 150)" }}
            />
          </span>
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "oklch(0.65 0.2 150)" }}
          >
            Live
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-foreground text-sm truncate">
            {team1}
          </p>
          <p
            className="text-xs mt-0.5 font-semibold"
            style={{ color: "oklch(0.75 0.1 80)" }}
          >
            {scores.a}
          </p>
        </div>
        <div
          className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{
            background: "oklch(0.22 0.04 255)",
            color: "oklch(0.6 0.08 255)",
          }}
        >
          VS
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className="font-display font-bold text-foreground text-sm truncate">
            {team2}
          </p>
          <p
            className="text-xs mt-0.5 font-semibold"
            style={{ color: "oklch(0.75 0.1 80)" }}
          >
            {scores.b}
          </p>
        </div>
      </div>

      <p
        className="text-xs truncate mb-2"
        style={{ color: "oklch(0.6 0.06 255)" }}
      >
        {match.status}
      </p>

      <div
        className="text-xs font-semibold text-right"
        style={{
          color: isLive ? "oklch(0.65 0.18 220)" : "oklch(0.55 0.08 255)",
        }}
      >
        {isLive ? "View Contests →" : "Join Contest →"}
      </div>
    </motion.button>
  );
}

interface Props {
  onMatchSelect: (match: ApiMatch) => void;
}

export default function HomeTab({ onMatchSelect }: Props) {
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isQuotaError, setIsQuotaError] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const loadMatches = useCallback(async (force = false) => {
    const result = await fetchMatchesWithCache(force);
    if (result.ok) {
      setMatches(result.matches);
      setError(null);
      setIsQuotaError(false);
      setFetchedAt(result.fetchedAt);
      setFromCache(result.fromCache);
    } else {
      // On error, keep any previously loaded matches visible
      setError(result.errorMessage);
      setIsQuotaError(result.isQuota);
    }
  }, []);

  // Initial load on mount only — no auto-refresh / polling
  useEffect(() => {
    loadMatches(false).finally(() => setLoading(false));
  }, [loadMatches]);

  const handleManualRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await loadMatches(true); // force bypass cache
    setRefreshing(false);
  }, [loadMatches, refreshing]);

  const liveMatches = matches.filter((m) => m.matchStarted && !m.matchEnded);
  const upcomingMatches = matches.filter((m) => !m.matchStarted);

  const cacheAgeSeconds = fetchedAt
    ? Math.floor((Date.now() - fetchedAt) / 1000)
    : null;
  const cacheLabel =
    cacheAgeSeconds !== null
      ? cacheAgeSeconds < 60
        ? `Updated ${cacheAgeSeconds}s ago${fromCache ? " (cached)" : ""}`
        : `Updated ${Math.floor(cacheAgeSeconds / 60)}m ago${fromCache ? " (cached)" : ""}`
      : null;

  if (loading) {
    return (
      <div
        data-ocid="home.loading_state"
        className="flex flex-col items-center justify-center py-20"
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mb-4"
          style={{
            borderColor: "oklch(0.65 0.18 220)",
            borderTopColor: "transparent",
          }}
        />
        <p className="text-sm text-muted-foreground">Fetching matches...</p>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="py-4 space-y-4"
      >
        {/* ── Live Matches ──────────────────────────────────────────────────── */}
        <section data-ocid="home.live_matches.section">
          <div className="flex items-center gap-2 mb-3 px-4">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: "oklch(0.65 0.2 150)" }}
              />
              <span
                className="relative inline-flex rounded-full h-2.5 w-2.5"
                style={{ background: "oklch(0.65 0.2 150)" }}
              />
            </span>
            <h2 className="font-display font-bold text-foreground text-base">
              Live Matches
            </h2>
            {liveMatches.length > 0 && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: "oklch(0.55 0.2 150 / 0.2)",
                  color: "oklch(0.65 0.2 150)",
                }}
              >
                {liveMatches.length}
              </span>
            )}
          </div>

          {error ? (
            <div className="px-4">
              <div
                data-ocid="home.error_state"
                className="rounded-2xl p-5 text-center"
                style={{
                  background: "oklch(0.17 0.03 255)",
                  border: "1px solid oklch(0.45 0.15 15 / 0.4)",
                }}
              >
                <p className="text-2xl mb-2">{isQuotaError ? "🚫" : "⚠️"}</p>
                <p
                  className="text-sm mb-3"
                  style={{ color: "oklch(0.75 0.05 255)" }}
                >
                  {error}
                </p>
                {isQuotaError && (
                  <p
                    className="text-xs mb-3"
                    style={{ color: "oklch(0.55 0.06 255)" }}
                  >
                    Your quota resets at midnight. Cached data will be shown
                    when available.
                  </p>
                )}
                <button
                  type="button"
                  data-ocid="home.retry.button"
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                  className="text-xs font-bold px-4 py-2 rounded-full transition-all"
                  style={{
                    background: "oklch(0.65 0.18 220 / 0.2)",
                    color: refreshing
                      ? "oklch(0.5 0.06 255)"
                      : "oklch(0.75 0.12 220)",
                    border: "1px solid oklch(0.65 0.18 220 / 0.4)",
                    cursor: refreshing ? "not-allowed" : "pointer",
                  }}
                >
                  {refreshing ? "Refreshing..." : "Retry"}
                </button>
              </div>
            </div>
          ) : liveMatches.length === 0 ? (
            <div className="px-4">
              <div
                data-ocid="home.live.empty_state"
                className="rounded-2xl p-5 text-center"
                style={{
                  background: "oklch(0.17 0.03 255)",
                  border: "1px solid oklch(0.25 0.04 255 / 0.4)",
                }}
              >
                <p className="text-2xl mb-2">📡</p>
                <p className="text-sm text-muted-foreground">
                  No live matches right now
                </p>
              </div>
            </div>
          ) : (
            <div
              data-ocid="home.live.scroll_row"
              style={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "nowrap",
                gap: "12px",
                overflowX: "auto",
                overflowY: "hidden",
                paddingLeft: "16px",
                paddingRight: "16px",
                paddingBottom: "8px",
                scrollSnapType: "x mandatory",
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {liveMatches.map((match, i) => (
                <div
                  key={match.id}
                  data-ocid={`home.live.item.${i + 1}`}
                  style={{ flexShrink: 0 }}
                >
                  <MatchCard
                    match={match}
                    isLive
                    onSelect={() => onMatchSelect(match)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Upcoming Matches ──────────────────────────────────────────────── */}
        {!error && (
          <section data-ocid="home.upcoming_matches.section">
            <div className="flex items-center gap-2 mb-3 px-4">
              <span className="text-base">📅</span>
              <h2 className="font-display font-bold text-foreground text-base">
                Upcoming Matches
              </h2>
              {upcomingMatches.length > 0 && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: "oklch(0.55 0.12 220 / 0.2)",
                    color: "oklch(0.65 0.12 220)",
                  }}
                >
                  {upcomingMatches.length}
                </span>
              )}
            </div>

            {upcomingMatches.length === 0 ? (
              <div className="px-4">
                <div
                  data-ocid="home.upcoming.empty_state"
                  className="rounded-2xl p-5 text-center"
                  style={{
                    background: "oklch(0.17 0.03 255)",
                    border: "1px solid oklch(0.25 0.04 255 / 0.4)",
                  }}
                >
                  <p className="text-sm text-muted-foreground">
                    No upcoming matches
                  </p>
                </div>
              </div>
            ) : (
              <div
                data-ocid="home.upcoming.scroll_row"
                style={{
                  display: "flex",
                  flexDirection: "row",
                  flexWrap: "nowrap",
                  gap: "12px",
                  overflowX: "auto",
                  overflowY: "hidden",
                  paddingLeft: "16px",
                  paddingRight: "16px",
                  paddingBottom: "8px",
                  scrollSnapType: "x mandatory",
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                {upcomingMatches.map((match, i) => (
                  <div
                    key={match.id}
                    data-ocid={`home.upcoming.item.${i + 1}`}
                    style={{ flexShrink: 0 }}
                  >
                    <MatchCard
                      match={match}
                      isLive={false}
                      onSelect={() => onMatchSelect(match)}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Footer: cache status + manual refresh ─────────────────────────── */}
        <div className="text-center pb-2 px-4 space-y-2">
          {cacheLabel && (
            <p
              className="text-[10px] font-semibold px-3 py-1 rounded-full inline-block"
              style={{
                background: "oklch(0.55 0.15 150 / 0.15)",
                color: "oklch(0.6 0.12 150)",
              }}
            >
              {cacheLabel} · tap Refresh to update
            </p>
          )}
          <div>
            <button
              type="button"
              data-ocid="home.manual_refresh.button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="text-xs font-semibold px-4 py-1.5 rounded-full transition-all"
              style={{
                background: refreshing
                  ? "oklch(0.2 0.03 255)"
                  : "oklch(0.65 0.18 220 / 0.15)",
                color: refreshing
                  ? "oklch(0.5 0.06 255)"
                  : "oklch(0.7 0.14 220)",
                border: "1px solid oklch(0.65 0.18 220 / 0.3)",
                cursor: refreshing ? "not-allowed" : "pointer",
              }}
            >
              {refreshing ? "Refreshing..." : "↻ Refresh Now"}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
