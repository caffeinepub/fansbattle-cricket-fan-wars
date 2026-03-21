import { useUser } from "@/context/UserContext";
import { submitGuess } from "@/lib/firestore";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const API_KEY = "4936fea0-ba32-4484-81de-8ca82f6501f6";
const API_URL = `https://api.cricapi.com/v1/currentMatches?apikey=${API_KEY}&offset=0`;
const REFRESH_INTERVAL = 15000;

interface ApiScore {
  r: number;
  w: number;
  o: number;
  inning: string;
}

interface ApiMatch {
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
      whileTap={{ scale: 0.98 }}
      className="w-full text-left rounded-2xl p-4 transition-all"
      style={{
        background: "oklch(0.17 0.03 255)",
        border: `1px solid ${isLive ? "oklch(0.55 0.2 150 / 0.5)" : "oklch(0.25 0.04 255 / 0.6)"}`,
        boxShadow: isLive ? "0 0 12px oklch(0.55 0.2 150 / 0.15)" : "none",
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
            className="text-[10px] font-700 uppercase tracking-widest"
            style={{ color: "oklch(0.65 0.2 150)" }}
          >
            Live
          </span>
        </div>
      )}

      {/* Teams */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-display font-700 text-foreground text-sm truncate">
            {team1}
          </p>
          <p
            className="text-xs mt-0.5 font-600"
            style={{ color: "oklch(0.75 0.1 80)" }}
          >
            {scores.a}
          </p>
        </div>
        <div
          className="text-xs font-700 px-2 py-0.5 rounded-full shrink-0"
          style={{
            background: "oklch(0.22 0.04 255)",
            color: "oklch(0.6 0.08 255)",
          }}
        >
          VS
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className="font-display font-700 text-foreground text-sm truncate">
            {team2}
          </p>
          <p
            className="text-xs mt-0.5 font-600"
            style={{ color: "oklch(0.75 0.1 80)" }}
          >
            {scores.b}
          </p>
        </div>
      </div>

      {/* Status */}
      <p className="text-xs truncate" style={{ color: "oklch(0.6 0.06 255)" }}>
        {match.status}
      </p>

      {isLive && (
        <div
          className="mt-2 text-xs font-600 text-right"
          style={{ color: "oklch(0.65 0.18 220)" }}
        >
          Tap to guess →
        </div>
      )}
    </motion.button>
  );
}

function MatchDetailPanel({
  match,
  onClose,
}: {
  match: ApiMatch;
  onClose: () => void;
}) {
  const { deviceId, coins } = useUser();
  const [guessSubmitted, setGuessSubmitted] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const team1 = match.teams?.[0] ?? "Team A";
  const team2 = match.teams?.[1] ?? "Team B";
  const scores = formatScore(match.score);

  const handleGuess = async (team: string) => {
    if (!deviceId) return;
    if (coins < 10) {
      toast.error("Need 10 coins to guess! Buy more in the shop.");
      return;
    }
    setSubmitting(true);
    const result = await submitGuess(deviceId, match.id, team);
    setSubmitting(false);
    if (result.success) {
      setGuessSubmitted(team);
      toast.success(`Guess submitted: ${team}! -10 🪙`);
    } else if (result.error === "already_guessed") {
      toast.info("You already guessed this match.");
      setGuessSubmitted(team);
    } else if (result.error === "insufficient_coins") {
      toast.error("Not enough coins!");
    } else {
      toast.error("Failed to submit guess. Try again.");
    }
  };

  return (
    <motion.div
      data-ocid="match.detail.panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "oklch(0.11 0.02 255 / 0.97)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 h-14"
        style={{ borderBottom: "1px solid oklch(0.25 0.04 255 / 0.4)" }}
      >
        <button
          type="button"
          data-ocid="match.detail.close_button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors text-sm font-600"
        >
          ← Back
        </button>
        <span className="font-display font-700 text-foreground text-sm">
          Match Details
        </span>
        <div className="w-12" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Scoreboard */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: "oklch(0.17 0.03 255)",
            border: "1px solid oklch(0.3 0.05 255 / 0.4)",
          }}
        >
          <p
            className="text-[10px] font-700 uppercase tracking-widest text-center mb-4"
            style={{ color: "oklch(0.6 0.08 255)" }}
          >
            {match.name}
          </p>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 text-center">
              <p className="font-display font-800 text-foreground text-base">
                {team1}
              </p>
              <p
                className="text-sm font-700 mt-1"
                style={{ color: "oklch(0.85 0.15 80)" }}
              >
                {scores.a}
              </p>
            </div>
            <div
              className="px-3 py-1 rounded-full text-xs font-700"
              style={{
                background: "oklch(0.22 0.04 255)",
                color: "oklch(0.6 0.08 255)",
              }}
            >
              VS
            </div>
            <div className="flex-1 text-center">
              <p className="font-display font-800 text-foreground text-base">
                {team2}
              </p>
              <p
                className="text-sm font-700 mt-1"
                style={{ color: "oklch(0.85 0.15 80)" }}
              >
                {scores.b}
              </p>
            </div>
          </div>
          <p
            className="text-xs text-center mt-4"
            style={{ color: "oklch(0.6 0.06 255)" }}
          >
            {match.status}
          </p>
        </div>

        {/* Guess section */}
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.2 0.06 255), oklch(0.15 0.04 255))",
            border: "1px solid oklch(0.65 0.18 220 / 0.3)",
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display font-700 text-foreground text-base">
              🏆 Guess Who Wins?
            </h3>
            <span
              className="text-xs font-600 px-2 py-1 rounded-full"
              style={{
                background: "oklch(0.88 0.18 80 / 0.15)",
                color: "oklch(0.85 0.18 80)",
                border: "1px solid oklch(0.85 0.18 80 / 0.3)",
              }}
            >
              Costs 10 🪙
            </span>
          </div>

          {guessSubmitted ? (
            <div
              className="text-center py-4 rounded-xl"
              style={{ background: "oklch(0.55 0.2 150 / 0.1)" }}
            >
              <p
                className="font-display font-700 text-base"
                style={{ color: "oklch(0.65 0.2 150)" }}
              >
                ✓ Guessed: {guessSubmitted}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Results after match ends
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                type="button"
                data-ocid="match.guess.team1.button"
                onClick={() => handleGuess(team1)}
                disabled={submitting}
                whileTap={{ scale: 0.97 }}
                className="py-3 rounded-xl font-display font-700 text-sm transition-all"
                style={{
                  background: "oklch(0.65 0.18 220 / 0.2)",
                  border: "1px solid oklch(0.65 0.18 220 / 0.5)",
                  color: "oklch(0.82 0.1 220)",
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                {team1}
              </motion.button>
              <motion.button
                type="button"
                data-ocid="match.guess.team2.button"
                onClick={() => handleGuess(team2)}
                disabled={submitting}
                whileTap={{ scale: 0.97 }}
                className="py-3 rounded-xl font-display font-700 text-sm transition-all"
                style={{
                  background: "oklch(0.72 0.18 50 / 0.2)",
                  border: "1px solid oklch(0.72 0.18 50 / 0.5)",
                  color: "oklch(0.88 0.15 60)",
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                {team2}
              </motion.button>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Only top 20–30% of guessers win. One guess per match.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function HomeTab() {
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<ApiMatch | null>(null);

  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("API error");
      const json: ApiResponse = await res.json();
      if (!json.data || !Array.isArray(json.data)) {
        setMatches([]);
      } else {
        setMatches(json.data.filter((m) => !m.matchEnded));
      }
      setError(null);
    } catch {
      setError("Failed to load matches. Check your connection.");
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
          style={{ borderColor: "oklch(0.65 0.18 220)" }}
        />
        <p className="text-sm text-muted-foreground">Loading matches...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-6">
      {/* Live Matches */}
      <section data-ocid="home.live_matches.section">
        <div className="flex items-center gap-2 mb-3">
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
          <h2 className="font-display font-700 text-foreground text-base">
            Live Matches
          </h2>
        </div>

        {error ? (
          <div
            data-ocid="home.error_state"
            className="rounded-2xl p-5 text-center"
            style={{
              background: "oklch(0.17 0.03 255)",
              border: "1px solid oklch(0.45 0.15 15 / 0.4)",
            }}
          >
            <p className="text-sm text-muted-foreground mb-3">{error}</p>
            <button
              type="button"
              data-ocid="home.retry.button"
              onClick={fetchMatches}
              className="text-xs font-700 px-4 py-2 rounded-full transition-all"
              style={{
                background: "oklch(0.65 0.18 220 / 0.2)",
                color: "oklch(0.75 0.12 220)",
                border: "1px solid oklch(0.65 0.18 220 / 0.4)",
              }}
            >
              Retry
            </button>
          </div>
        ) : liveMatches.length === 0 ? (
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
        ) : (
          <div className="space-y-3">
            {liveMatches.map((match, i) => (
              <div key={match.id} data-ocid={`home.live.item.${i + 1}`}>
                <MatchCard
                  match={match}
                  isLive
                  onSelect={() => setSelectedMatch(match)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming Matches */}
      <section data-ocid="home.upcoming_matches.section">
        <h2 className="font-display font-700 text-foreground text-base mb-3">
          📅 Upcoming Matches
        </h2>

        {upcomingMatches.length === 0 ? (
          <div
            data-ocid="home.upcoming.empty_state"
            className="rounded-2xl p-5 text-center"
            style={{
              background: "oklch(0.17 0.03 255)",
              border: "1px solid oklch(0.25 0.04 255 / 0.4)",
            }}
          >
            <p className="text-sm text-muted-foreground">No upcoming matches</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingMatches.map((match, i) => (
              <div key={match.id} data-ocid={`home.upcoming.item.${i + 1}`}>
                <MatchCard
                  match={match}
                  isLive={false}
                  onSelect={() => setSelectedMatch(match)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Auto-refresh note */}
      <p className="text-center text-xs text-muted-foreground/50 pb-2">
        Auto-refreshes every 15s
      </p>

      {/* Match Detail Panel */}
      <AnimatePresence>
        {selectedMatch && (
          <MatchDetailPanel
            match={selectedMatch}
            onClose={() => setSelectedMatch(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
