import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";

const API_KEY = "4936fea0-ba32-4484-81de-8ca82f6501f6";
const REFRESH_INTERVAL = 15000;

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
}

function formatScore(score?: ApiScore[]): { a: string; b: string } {
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
      {/* Live badge */}
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

      {/* Teams */}
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

      {/* Status */}
      <p
        className="text-xs truncate mb-2"
        style={{ color: "oklch(0.6 0.06 255)" }}
      >
        {match.status}
      </p>

      {/* CTA */}
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
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMatches = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(
        `https://api.cricapi.com/v1/currentMatches?apikey=${API_KEY}&offset=0`,
        { signal: controller.signal },
      );
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json: ApiResponse = await res.json();

      if (json.status !== "success") {
        throw new Error(json.status || "API returned non-success");
      }

      if (!json.data || !Array.isArray(json.data)) {
        setMatches([]);
      } else {
        setMatches(json.data.filter((m) => !m.matchEnded));
      }
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Request timed out. Check your connection.");
      } else {
        setError("Failed to load matches. Check your connection.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  const liveMatches = matches.filter((m) => m.matchStarted && !m.matchEnded);
  const upcomingMatches = matches.filter((m) => !m.matchStarted);

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
        <p className="text-sm text-muted-foreground">Loading matches...</p>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="py-4 space-y-6"
      >
        {/* Live Matches */}
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
                <p className="text-xl mb-2">⚠️</p>
                <p className="text-sm text-muted-foreground mb-3">{error}</p>
                <button
                  type="button"
                  data-ocid="home.retry.button"
                  onClick={fetchMatches}
                  className="text-xs font-bold px-4 py-2 rounded-full transition-all"
                  style={{
                    background: "oklch(0.65 0.18 220 / 0.2)",
                    color: "oklch(0.75 0.12 220)",
                    border: "1px solid oklch(0.65 0.18 220 / 0.4)",
                  }}
                >
                  Retry
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

        {/* Upcoming Matches */}
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

        {/* Footer */}
        <div className="text-center pb-2 space-y-1">
          <p className="text-xs text-muted-foreground/50">
            Auto-refreshes every 15s
          </p>
          {lastUpdated && (
            <p className="text-[10px] text-muted-foreground/30">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
