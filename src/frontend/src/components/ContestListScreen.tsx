import type { ApiMatch } from "@/components/tabs/HomeTab";
import { useUser } from "@/context/UserContext";
import {
  type Contest,
  getContestEntry,
  getContestsForMatch,
  joinContest,
} from "@/lib/firestore";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Props {
  match: ApiMatch;
  onBack: () => void;
  onJoinContest: (contest: Contest) => void;
}

function formatScore(match: ApiMatch): string {
  if (!match.score || match.score.length === 0) return "Yet to start";
  const s = match.score[0];
  return s ? `${s.r}/${s.w} (${s.o} ov)` : "Yet to bat";
}

function ContestCard({
  contest,
  alreadyJoined,
  onJoin,
  joining,
}: {
  contest: Contest;
  alreadyJoined: boolean;
  onJoin: () => void;
  joining: boolean;
}) {
  const [countdown, setCountdown] = useState(contest.countdown);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!contest.isLive || contest.status !== "open") return;
    setCountdown(contest.countdown);
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [contest.isLive, contest.status, contest.countdown]);

  const isLocked =
    contest.status === "locked" || (contest.isLive && countdown === 0);
  const isCompleted = contest.status === "completed";
  const spotsLeft = contest.totalSpots - contest.joinedUsers.length;
  const fillPercent = Math.min(
    100,
    (contest.joinedUsers.length / contest.totalSpots) * 100,
  );

  const typeBadgeColor = {
    mini: "oklch(0.65 0.18 220)",
    mega: "oklch(0.72 0.2 280)",
    h2h: "oklch(0.72 0.18 50)",
  }[contest.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: contest.isLive
          ? "linear-gradient(135deg, oklch(0.2 0.07 50), oklch(0.15 0.04 255))"
          : "linear-gradient(135deg, oklch(0.19 0.05 255), oklch(0.15 0.03 255))",
        border: `1px solid ${
          contest.isLive
            ? "oklch(0.65 0.2 50 / 0.5)"
            : "oklch(0.3 0.05 255 / 0.4)"
        }`,
        boxShadow: contest.isLive
          ? "0 0 20px oklch(0.65 0.18 50 / 0.2)"
          : "none",
      }}
    >
      <div className="p-4 space-y-3">
        {/* Title row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-display font-bold text-foreground text-sm truncate">
              {contest.name}
            </span>
            <span
              className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0"
              style={{
                background: `${typeBadgeColor}22`,
                color: typeBadgeColor,
                border: `1px solid ${typeBadgeColor}44`,
              }}
            >
              {contest.type === "h2h" ? "H2H" : contest.type.toUpperCase()}
            </span>

            {contest.isLive && (
              <span
                className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 animate-pulse"
                style={{
                  background: "oklch(0.65 0.2 50 / 0.2)",
                  color: "oklch(0.75 0.2 50)",
                  border: "1px solid oklch(0.65 0.2 50 / 0.4)",
                }}
              >
                🔴 LIVE
              </span>
            )}
          </div>

          {/* Status badge */}
          {isCompleted ? (
            <span
              className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full"
              style={{
                background: "oklch(0.35 0.03 255 / 0.5)",
                color: "oklch(0.55 0.05 255)",
              }}
            >
              COMPLETED
            </span>
          ) : isLocked ? (
            <span
              className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full"
              style={{
                background: "oklch(0.45 0.2 15 / 0.2)",
                color: "oklch(0.65 0.2 15)",
              }}
            >
              LOCKED
            </span>
          ) : (
            <span
              className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full"
              style={{
                background: "oklch(0.55 0.2 150 / 0.15)",
                color: "oklch(0.65 0.2 150)",
              }}
            >
              OPEN
            </span>
          )}
        </div>

        {/* Countdown for live contests */}
        {contest.isLive && !isLocked && (
          <div
            className="flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: "oklch(0.75 0.2 50)" }}
          >
            <span>⏱</span>
            <span>Locks in {countdown}s</span>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p
              className="text-base font-bold font-display"
              style={{ color: "oklch(0.85 0.18 80)" }}
            >
              🪙 {contest.entryFee}
            </p>
            <p className="text-[10px] text-muted-foreground">Entry</p>
          </div>
          <div className="text-center">
            <p
              className="text-base font-bold font-display"
              style={{ color: "oklch(0.75 0.15 150)" }}
            >
              🏆 {contest.prizePool}
            </p>
            <p className="text-[10px] text-muted-foreground">Prize Pool</p>
          </div>
          <div className="text-center">
            <p
              className="text-base font-bold font-display"
              style={{ color: "oklch(0.75 0.15 280)" }}
            >
              🥇 {contest.winnersCount}
            </p>
            <p className="text-[10px] text-muted-foreground">Winners</p>
          </div>
        </div>

        {/* Spots progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{contest.joinedUsers.length} joined</span>
            <span>{spotsLeft} spots left</span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: "oklch(0.22 0.04 255)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${fillPercent}%`,
                background:
                  "linear-gradient(90deg, oklch(0.65 0.18 220), oklch(0.7 0.2 280))",
              }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {contest.totalSpots} total spots
          </p>
        </div>

        {/* Join button */}
        <button
          type="button"
          data-ocid="contest.join.button"
          onClick={onJoin}
          disabled={isLocked || isCompleted || joining}
          className="w-full py-3 rounded-xl font-display font-bold text-sm transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background:
              isLocked || isCompleted
                ? "oklch(0.22 0.04 255)"
                : alreadyJoined
                  ? "oklch(0.55 0.2 150 / 0.2)"
                  : "linear-gradient(135deg, oklch(0.65 0.18 220), oklch(0.72 0.2 230))",
            color:
              isLocked || isCompleted
                ? "oklch(0.5 0.05 255)"
                : alreadyJoined
                  ? "oklch(0.65 0.2 150)"
                  : "white",
            border: alreadyJoined
              ? "1px solid oklch(0.55 0.2 150 / 0.4)"
              : "none",
          }}
        >
          {joining
            ? "Joining..."
            : isLocked
              ? "Locked"
              : isCompleted
                ? "Completed"
                : alreadyJoined
                  ? "✓ Joined — View Questions"
                  : `Join for ${contest.entryFee} 🪙`}
        </button>
      </div>
    </motion.div>
  );
}

export default function ContestListScreen({
  match,
  onBack,
  onJoinContest,
}: Props) {
  const { deviceId } = useUser();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinedContestIds, setJoinedContestIds] = useState<Set<string>>(
    new Set(),
  );
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const team1 = match.teams?.[0] ?? "Team A";
  const team2 = match.teams?.[1] ?? "Team B";
  const isLive = match.matchStarted && !match.matchEnded;

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [fetchedContests] = await Promise.all([
          getContestsForMatch(match.id, team1, team2, isLive),
        ]);
        if (!mounted) return;
        setContests(fetchedContests);

        if (deviceId) {
          const entryChecks = await Promise.all(
            fetchedContests.map((c) => getContestEntry(deviceId, c.id)),
          );
          const joined = new Set<string>();
          fetchedContests.forEach((c, i) => {
            if (entryChecks[i]) joined.add(c.id);
          });
          if (mounted) setJoinedContestIds(joined);
        }
      } catch {
        toast.error("Failed to load contests.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [match.id, team1, team2, isLive, deviceId]);

  const handleJoin = async (contest: Contest) => {
    if (!deviceId) return;

    // If already joined, navigate to questions
    if (joinedContestIds.has(contest.id)) {
      onJoinContest(contest);
      return;
    }

    setJoiningId(contest.id);
    const result = await joinContest(
      deviceId,
      contest.id,
      match.id,
      contest.entryFee,
    );
    setJoiningId(null);

    if (result.success) {
      setJoinedContestIds((prev) => new Set([...prev, contest.id]));
      toast.success(`Joined! -${contest.entryFee} 🪙`);
      onJoinContest(contest);
    } else if (result.error === "ALREADY_JOINED") {
      setJoinedContestIds((prev) => new Set([...prev, contest.id]));
      onJoinContest(contest);
    } else if (result.error === "INSUFFICIENT_COINS") {
      toast.error("Not enough coins! Visit Shop to top up.");
    } else if (result.error === "CONTEST_LOCKED") {
      toast.error("This contest is now locked.");
    } else {
      toast.error("Failed to join. Try again.");
    }
  };

  return (
    <div
      data-ocid="contest_list.page"
      className="app-shell flex flex-col"
      style={{ background: "oklch(0.11 0.02 255)", minHeight: "100dvh" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 h-16 shrink-0"
        style={{
          borderBottom: "1px solid oklch(0.25 0.04 255 / 0.4)",
          background: "oklch(0.13 0.025 255 / 0.98)",
        }}
      >
        <button
          type="button"
          data-ocid="contest_list.back.button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold transition-colors"
          style={{ color: "oklch(0.65 0.18 220)" }}
        >
          <span className="text-base">←</span>
          <span>Back</span>
        </button>
        <div className="flex-1 text-center min-w-0">
          <p className="font-display font-bold text-foreground text-sm">
            Select Contest
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {team1} vs {team2}
          </p>
        </div>
        <div className="w-14" />
      </div>

      {/* Match scoreboard */}
      <div
        className="mx-4 mt-4 rounded-2xl p-3 flex items-center justify-between"
        style={{
          background: "oklch(0.17 0.03 255)",
          border: "1px solid oklch(0.28 0.05 255 / 0.5)",
        }}
      >
        <div className="text-center flex-1">
          <p className="font-display font-bold text-foreground text-sm truncate">
            {team1}
          </p>
          {match.score?.[0] && (
            <p
              className="text-xs mt-0.5"
              style={{ color: "oklch(0.75 0.1 80)" }}
            >
              {match.score[0].r}/{match.score[0].w} ({match.score[0].o} ov)
            </p>
          )}
        </div>
        <div className="flex flex-col items-center gap-0.5 px-3">
          {isLive && (
            <span className="relative flex h-1.5 w-1.5 mb-0.5">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: "oklch(0.65 0.2 150)" }}
              />
              <span
                className="relative inline-flex rounded-full h-1.5 w-1.5"
                style={{ background: "oklch(0.65 0.2 150)" }}
              />
            </span>
          )}
          <span
            className="text-xs font-bold"
            style={{ color: "oklch(0.55 0.08 255)" }}
          >
            VS
          </span>
          <span
            className="text-[9px] font-semibold"
            style={{
              color: isLive ? "oklch(0.65 0.2 150)" : "oklch(0.5 0.05 255)",
            }}
          >
            {isLive ? "LIVE" : formatScore(match)}
          </span>
        </div>
        <div className="text-center flex-1">
          <p className="font-display font-bold text-foreground text-sm truncate">
            {team2}
          </p>
          {match.score?.[1] && (
            <p
              className="text-xs mt-0.5"
              style={{ color: "oklch(0.75 0.1 80)" }}
            >
              {match.score[1].r}/{match.score[1].w} ({match.score[1].o} ov)
            </p>
          )}
        </div>
      </div>

      {/* Contest list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div
            data-ocid="contest_list.loading_state"
            className="flex flex-col items-center justify-center py-16"
          >
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mb-4"
              style={{ borderColor: "oklch(0.65 0.18 220)" }}
            />
            <p className="text-sm text-muted-foreground">Loading contests...</p>
          </div>
        ) : contests.length === 0 ? (
          <div
            data-ocid="contest_list.empty_state"
            className="text-center py-16"
          >
            <p className="text-muted-foreground">No contests available.</p>
          </div>
        ) : (
          contests.map((contest, i) => (
            <div key={contest.id} data-ocid={`contest_list.item.${i + 1}`}>
              <ContestCard
                contest={contest}
                alreadyJoined={joinedContestIds.has(contest.id)}
                onJoin={() => handleJoin(contest)}
                joining={joiningId === contest.id}
              />
            </div>
          ))
        )}
      </div>

      <p className="text-center text-[10px] text-muted-foreground/40 py-3">
        For entertainment only. Not affiliated with IPL or BCCI.
      </p>
    </div>
  );
}
