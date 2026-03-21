import { Badge } from "@/components/ui/badge";
import { useUser } from "@/context/UserContext";
import {
  type LiveMatch as LiveMatchData,
  fetchLiveMatches,
} from "@/lib/cricketApi";
import { getUserGuess, storeGuess } from "@/lib/firestore";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Props {
  addCoins: (n: number, type: string) => Promise<void>;
  spendCoins: (n: number, type: string) => Promise<boolean>;
  onGameEnd?: () => void;
}

const GUESS_COST = 10;
const CORRECT_REWARD = 25;

// Generic questions that work for any match — options filled in dynamically
const GENERIC_QUESTIONS = [
  {
    id: "q_winner",
    question: "Who will win the match?",
    type: "teams",
    emoji: "🏆",
    timer: 60,
  },
  {
    id: "q_century",
    question: "Will there be a century in this match?",
    options: ["Yes", "No"],
    emoji: "💯",
    timer: 45,
  },
  {
    id: "q_over10",
    question: "Over runs above 10 in the next over?",
    options: ["Yes", "No"],
    emoji: "📊",
    timer: 45,
  },
  {
    id: "q_boundary",
    question: "Next ball result?",
    options: ["Boundary (4)", "Boundary (6)", "Dot Ball", "Single"],
    emoji: "🎯",
    timer: 20,
  },
  {
    id: "q_wicket",
    question: "Wicket in the next 5 balls?",
    options: ["Yes", "No"],
    emoji: "🎳",
    timer: 30,
  },
];

type CardState = "idle" | "locked" | "resolved";

interface CardData {
  state: CardState;
  selected: string | null;
  timeLeft: number;
  isCorrect: boolean | null;
}

function formatTime(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  return `${seconds}s`;
}

function MatchCard({
  match,
  isSelected,
  onTap,
}: { match: LiveMatchData; isSelected: boolean; onTap: () => void }) {
  return (
    <motion.div
      key={match.id}
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-glass rounded-2xl overflow-hidden cursor-pointer"
      onClick={onTap}
      style={{
        border: isSelected
          ? "1px solid oklch(0.65 0.2 230 / 0.7)"
          : "1px solid oklch(0.25 0.04 255 / 0.4)",
        boxShadow: isSelected
          ? "0 0 16px oklch(0.65 0.2 230 / 0.25)"
          : undefined,
      }}
    >
      {/* Top bar */}
      <div
        className="px-4 py-2 flex items-center justify-between"
        style={{
          background: "oklch(0.18 0.04 255 / 0.6)",
          borderBottom: "1px solid oklch(0.3 0.05 255 / 0.3)",
        }}
      >
        <Badge
          className="text-xs font-bold px-2 py-0.5 flex items-center gap-1"
          style={{
            background: "oklch(0.62 0.22 15)",
            color: "white",
            border: "none",
          }}
        >
          <span className="live-dot mr-1" /> LIVE
        </Badge>
        <span
          className="text-xs font-semibold"
          style={{ color: "oklch(0.75 0.18 90)" }}
        >
          {match.event}
        </span>
        <span className="text-xs" style={{ color: "oklch(0.55 0.05 255)" }}>
          {isSelected ? "▲ Hide" : "▼ Guess"}
        </span>
      </div>

      {/* Score section */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <p
              className="font-display text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: "oklch(0.75 0.06 255)" }}
            >
              {match.teamA}
            </p>
            <p
              className="font-display text-2xl font-bold"
              style={{ color: "oklch(0.95 0.04 255)" }}
            >
              {match.scoreA}
            </p>
            <p className="text-xs" style={{ color: "oklch(0.65 0.05 255)" }}>
              {match.oversA} ov
            </p>
          </div>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{
              background: "oklch(0.22 0.04 255 / 0.8)",
              border: "1px solid oklch(0.35 0.06 255)",
              color: "oklch(0.7 0.06 255)",
            }}
          >
            VS
          </div>
          <div className="text-center flex-1">
            <p
              className="font-display text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: "oklch(0.75 0.06 255)" }}
            >
              {match.teamB}
            </p>
            <p
              className="font-display text-2xl font-bold"
              style={{ color: "oklch(0.88 0.18 90)" }}
            >
              {match.scoreB}
            </p>
            <p className="text-xs" style={{ color: "oklch(0.65 0.05 255)" }}>
              {match.oversB} ov
            </p>
          </div>
        </div>
        <div
          className="mt-3 px-3 py-2 rounded-xl text-xs text-center font-semibold"
          style={{
            background: "oklch(0.2 0.04 255 / 0.5)",
            color: "oklch(0.75 0.1 255)",
          }}
        >
          {match.status}
        </div>
      </div>
    </motion.div>
  );
}

export default function LiveMatch({ addCoins, spendCoins, onGameEnd }: Props) {
  const { userId } = useUser();
  const [liveMatches, setLiveMatches] = useState<LiveMatchData[]>([]);
  const [fetchError, setFetchError] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  // Per-match guess state: { [matchId]: { [questionId]: CardData } }
  const [guessState, setGuessState] = useState<
    Record<string, Record<string, CardData>>
  >({});
  // Already-guessed (from Firestore): { [matchId+questionId]: choice }
  const [existingGuesses, setExistingGuesses] = useState<
    Record<string, string>
  >({});
  const [loadingGuesses, setLoadingGuesses] = useState(false);

  const intervals = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const loadMatches = useCallback(async () => {
    try {
      setLoadingMatches(true);
      const matches = await fetchLiveMatches();
      setLiveMatches(matches);
      setFetchError(false);
    } catch {
      setFetchError(true);
    } finally {
      setLoadingMatches(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
    const interval = setInterval(loadMatches, 15000);
    return () => clearInterval(interval);
  }, [loadMatches]);

  useEffect(() => {
    const saved = intervals.current;
    return () => {
      for (const k of Object.values(saved)) clearInterval(k);
    };
  }, []);

  // Load existing guesses from Firestore when a match is selected
  const handleSelectMatch = useCallback(
    async (matchId: string) => {
      if (selectedMatchId === matchId) {
        setSelectedMatchId(null);
        return;
      }
      setSelectedMatchId(matchId);
      if (!userId) return;

      setLoadingGuesses(true);
      const results: Record<string, string> = {};
      await Promise.all(
        GENERIC_QUESTIONS.map(async (q) => {
          const existing = await getUserGuess(userId, matchId, q.id);
          if (existing) results[`${matchId}__${q.id}`] = existing.choice;
        }),
      );
      setExistingGuesses((prev) => ({ ...prev, ...results }));
      setLoadingGuesses(false);
    },
    [selectedMatchId, userId],
  );

  const getCard = (
    matchId: string,
    questionId: string,
    timer: number,
  ): CardData => {
    return (
      guessState[matchId]?.[questionId] ?? {
        state: "idle",
        selected: null,
        timeLeft: timer,
        isCorrect: null,
      }
    );
  };

  const setCard = (
    matchId: string,
    questionId: string,
    updater: (prev: CardData) => CardData,
  ) => {
    setGuessState((prev) => {
      const matchCards = prev[matchId] ?? {};
      const existing = matchCards[questionId] ?? {
        state: "idle",
        selected: null,
        timeLeft: 0,
        isCorrect: null,
      };
      return {
        ...prev,
        [matchId]: { ...matchCards, [questionId]: updater(existing) },
      };
    });
  };

  const selectOption = (
    matchId: string,
    questionId: string,
    option: string,
    timer: number,
  ) => {
    const card = getCard(matchId, questionId, timer);
    if (card.state !== "idle") return;
    setCard(matchId, questionId, (c) => ({ ...c, selected: option }));
  };

  const lockGuess = async (
    matchId: string,
    question: (typeof GENERIC_QUESTIONS)[0],
    match: LiveMatchData,
  ) => {
    const card = getCard(matchId, question.id, question.timer);
    if (!card.selected) {
      toast.error("Select an option first!");
      return;
    }
    if (!userId) {
      toast.error("Please log in first");
      return;
    }

    // Check Firestore for duplicate
    const existing = existingGuesses[`${matchId}__${question.id}`];
    if (existing) {
      toast.info(`Already guessed: ${existing}`);
      return;
    }

    const ok = await spendCoins(GUESS_COST, "guess_entry");
    if (!ok) return;

    // Store in Firestore
    try {
      await storeGuess(userId, matchId, question.id, card.selected);
      setExistingGuesses((prev) => ({
        ...prev,
        [`${matchId}__${question.id}`]: card.selected!,
      }));
    } catch {
      toast.error("Failed to store guess");
      return;
    }

    setCard(matchId, question.id, (c) => ({
      ...c,
      state: "locked",
      timeLeft: question.timer,
    }));
    void match; // match data available if needed

    let remaining = question.timer;
    const key = `${matchId}__${question.id}`;
    const interval = setInterval(async () => {
      remaining -= 1;
      setCard(matchId, question.id, (c) => ({ ...c, timeLeft: remaining }));
      if (remaining <= 0) {
        clearInterval(interval);
        delete intervals.current[key];
        // Resolution: random for now (no outcome API available)
        const correct = Math.random() < 0.5;
        if (correct) await addCoins(CORRECT_REWARD, "correct_guess");
        setCard(matchId, question.id, (c) => ({
          ...c,
          state: "resolved",
          isCorrect: correct,
          timeLeft: 0,
        }));
        if (Math.random() < 0.4) onGameEnd?.();
        if (correct)
          toast.success(`🏑 Correct! +${CORRECT_REWARD} 🪙`, {
            duration: 3000,
          });
        else
          toast.error(`❌ Wrong guess! Lost ${GUESS_COST} 🪙`, {
            duration: 3000,
          });
      }
    }, 1000);
    intervals.current[key] = interval;
  };

  return (
    <div className="px-4 py-4 space-y-4 pb-24">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2
          className="font-display text-lg font-bold"
          style={{ color: "oklch(0.92 0.04 255)" }}
        >
          🏏 Live Matches
        </h2>
        <Badge
          className="text-xs px-2 py-0.5"
          style={{
            background: "oklch(0.62 0.2 140 / 0.15)",
            color: "oklch(0.75 0.18 140)",
            border: "1px solid oklch(0.62 0.2 140 / 0.3)",
          }}
        >
          🔄 Auto-refreshing
        </Badge>
      </div>

      {/* Loading state */}
      {loadingMatches && liveMatches.length === 0 && (
        <div
          data-ocid="live_match.loading_state"
          className="card-glass rounded-2xl p-8 flex flex-col items-center gap-3"
        >
          <div className="animate-spin text-4xl">🏏</div>
          <p className="text-sm" style={{ color: "oklch(0.6 0.05 255)" }}>
            Loading live matches...
          </p>
        </div>
      )}

      {/* Error state */}
      {fetchError && liveMatches.length === 0 && (
        <div
          data-ocid="live_match.error_state"
          className="card-glass rounded-2xl p-6 text-center"
        >
          <div className="text-4xl mb-3">📡</div>
          <p className="font-bold" style={{ color: "oklch(0.92 0.04 255)" }}>
            Could not load live matches
          </p>
          <p className="text-sm mt-1" style={{ color: "oklch(0.6 0.05 255)" }}>
            Check your connection or try again later
          </p>
          <button
            type="button"
            onClick={loadMatches}
            data-ocid="live_match.retry_button"
            className="mt-4 px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
            style={{
              background: "oklch(0.65 0.18 220 / 0.2)",
              border: "1px solid oklch(0.65 0.18 220 / 0.4)",
              color: "oklch(0.78 0.12 220)",
            }}
          >
            🔄 Retry
          </button>
        </div>
      )}

      {/* No live matches */}
      {!loadingMatches && liveMatches.length === 0 && !fetchError && (
        <div
          data-ocid="live_match.empty_state"
          className="card-glass rounded-2xl p-6 text-center"
        >
          <div className="text-4xl mb-3">🏟️</div>
          <p className="font-bold" style={{ color: "oklch(0.92 0.04 255)" }}>
            No live matches currently
          </p>
          <p className="text-sm mt-1" style={{ color: "oklch(0.6 0.05 255)" }}>
            Check back soon for live action!
          </p>
          <p className="text-xs mt-3" style={{ color: "oklch(0.45 0.04 255)" }}>
            Auto-refreshing every 15 seconds
          </p>
        </div>
      )}

      {/* Live matches list */}
      {liveMatches.length > 0 && (
        <div className="space-y-3">
          {liveMatches.map((match) => (
            <div key={match.id}>
              <MatchCard
                match={match}
                isSelected={selectedMatchId === match.id}
                onTap={() => handleSelectMatch(match.id)}
              />

              {/* Inline guess panel for selected match */}
              <AnimatePresence>
                {selectedMatchId === match.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 space-y-3">
                      {/* Match Detail Header */}
                      <div
                        className="card-glass rounded-2xl px-4 py-3"
                        style={{
                          border: "1px solid oklch(0.65 0.2 230 / 0.3)",
                        }}
                      >
                        <p
                          className="font-display text-sm font-bold mb-1"
                          style={{ color: "oklch(0.88 0.12 230)" }}
                        >
                          🎯 Guess &amp; Earn — {match.teamA} vs {match.teamB}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "oklch(0.55 0.05 255)" }}
                        >
                          Entry: {GUESS_COST} 🪙 · Correct reward:{" "}
                          {CORRECT_REWARD} 🪙 · One guess per question
                        </p>
                      </div>

                      {loadingGuesses && (
                        <div className="text-center py-4">
                          <div className="animate-spin text-2xl">⏳</div>
                          <p
                            className="text-xs mt-2"
                            style={{ color: "oklch(0.55 0.05 255)" }}
                          >
                            Loading your guesses...
                          </p>
                        </div>
                      )}

                      {!loadingGuesses &&
                        GENERIC_QUESTIONS.map((question, idx) => {
                          const existingKey = `${match.id}__${question.id}`;
                          const alreadyGuessed = existingGuesses[existingKey];
                          const card = getCard(
                            match.id,
                            question.id,
                            question.timer,
                          );
                          const isIdle =
                            card.state === "idle" && !alreadyGuessed;
                          const isLocked = card.state === "locked";
                          const isResolved = card.state === "resolved";
                          const isCorrect = card.isCorrect;

                          // Build options: for "teams" type, use actual team names
                          const options =
                            question.type === "teams"
                              ? [match.teamA, match.teamB]
                              : (question.options ?? []);

                          const glowStyle = isResolved
                            ? isCorrect
                              ? {
                                  boxShadow:
                                    "0 0 24px oklch(0.62 0.2 140 / 0.5)",
                                }
                              : {
                                  boxShadow:
                                    "0 0 24px oklch(0.62 0.22 15 / 0.5)",
                                }
                            : {};

                          return (
                            <motion.div
                              key={question.id}
                              data-ocid={`live_match.guess.card.${idx + 1}`}
                              initial={{ opacity: 0, y: 16 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.06 }}
                              className="card-glass rounded-2xl p-4"
                              style={glowStyle}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-start gap-2 flex-1">
                                  <span className="text-2xl leading-none mt-0.5">
                                    {question.emoji}
                                  </span>
                                  <p
                                    className="font-display text-sm font-bold leading-snug"
                                    style={{ color: "oklch(0.92 0.04 255)" }}
                                  >
                                    {question.question}
                                  </p>
                                </div>
                                <div
                                  className="ml-2 flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full"
                                  style={{
                                    background: alreadyGuessed
                                      ? "oklch(0.55 0.15 220 / 0.2)"
                                      : isLocked
                                        ? "oklch(0.72 0.18 50 / 0.15)"
                                        : isResolved
                                          ? isCorrect
                                            ? "oklch(0.62 0.2 140 / 0.2)"
                                            : "oklch(0.62 0.22 15 / 0.2)"
                                          : "oklch(0.72 0.18 50 / 0.15)",
                                    color: alreadyGuessed
                                      ? "oklch(0.78 0.15 220)"
                                      : isLocked
                                        ? "oklch(0.82 0.18 55)"
                                        : isResolved
                                          ? isCorrect
                                            ? "oklch(0.75 0.18 140)"
                                            : "oklch(0.75 0.2 15)"
                                          : "oklch(0.82 0.18 55)",
                                    border:
                                      "1px solid oklch(0.35 0.06 255 / 0.4)",
                                  }}
                                >
                                  {alreadyGuessed
                                    ? `✓ ${alreadyGuessed}`
                                    : isLocked
                                      ? `⏱ ${formatTime(card.timeLeft)}`
                                      : isResolved
                                        ? isCorrect
                                          ? "✅ Won"
                                          : "❌ Lost"
                                        : `⏱ ${formatTime(question.timer)}`}
                                </div>
                              </div>

                              {/* Already guessed from Firestore */}
                              {alreadyGuessed && (
                                <div
                                  className="rounded-xl px-3 py-2.5 text-sm text-center font-semibold"
                                  style={{
                                    background: "oklch(0.55 0.15 220 / 0.12)",
                                    color: "oklch(0.75 0.12 220)",
                                    border:
                                      "1px solid oklch(0.55 0.15 220 / 0.3)",
                                  }}
                                >
                                  You already guessed:{" "}
                                  <strong>{alreadyGuessed}</strong>
                                </div>
                              )}

                              {/* Option buttons */}
                              {!alreadyGuessed && (
                                <>
                                  <div className="grid grid-cols-2 gap-2 mb-3">
                                    {options.map((opt, optIdx) => {
                                      const isSelected = card.selected === opt;
                                      const isDisabled = !isIdle;
                                      let bgColor = "oklch(0.2 0.04 255)";
                                      let borderColor = "oklch(0.3 0.04 255)";
                                      let textColor = "oklch(0.7 0.05 255)";
                                      let shadow = "none";

                                      if (isSelected && isIdle) {
                                        bgColor = "oklch(0.62 0.18 230 / 0.2)";
                                        borderColor = "oklch(0.65 0.18 230)";
                                        textColor = "oklch(0.88 0.12 230)";
                                        shadow =
                                          "0 0 10px oklch(0.65 0.18 230 / 0.35)";
                                      } else if (isSelected && isLocked) {
                                        bgColor = "oklch(0.72 0.18 50 / 0.15)";
                                        borderColor =
                                          "oklch(0.72 0.18 50 / 0.6)";
                                        textColor = "oklch(0.88 0.16 60)";
                                        shadow =
                                          "0 0 10px oklch(0.72 0.18 50 / 0.3)";
                                      } else if (isSelected && isResolved) {
                                        if (isCorrect) {
                                          bgColor = "oklch(0.62 0.2 140 / 0.2)";
                                          borderColor = "oklch(0.62 0.2 140)";
                                          textColor = "oklch(0.78 0.16 140)";
                                        } else {
                                          bgColor = "oklch(0.62 0.22 15 / 0.2)";
                                          borderColor = "oklch(0.62 0.22 15)";
                                          textColor = "oklch(0.78 0.18 15)";
                                        }
                                      }

                                      return (
                                        <button
                                          key={opt}
                                          type="button"
                                          data-ocid={`live_match.guess.button.${optIdx + 1}`}
                                          onClick={() =>
                                            selectOption(
                                              match.id,
                                              question.id,
                                              opt,
                                              question.timer,
                                            )
                                          }
                                          disabled={isDisabled}
                                          className="text-left text-sm px-3 py-2.5 rounded-xl transition-all duration-200 font-semibold"
                                          style={{
                                            background: bgColor,
                                            border: `1px solid ${borderColor}`,
                                            color: textColor,
                                            boxShadow: shadow,
                                            opacity:
                                              isDisabled && !isSelected
                                                ? 0.45
                                                : 1,
                                            cursor: isDisabled
                                              ? "default"
                                              : "pointer",
                                          }}
                                        >
                                          <span
                                            className="text-xs font-bold mr-1"
                                            style={{
                                              color: "oklch(0.55 0.06 255)",
                                            }}
                                          >
                                            {String.fromCharCode(65 + optIdx)}.
                                          </span>
                                          {opt}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  <AnimatePresence mode="wait">
                                    {isIdle && (
                                      <motion.button
                                        key="cta-guess"
                                        data-ocid={`live_match.guess.submit_button.${idx + 1}`}
                                        type="button"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        onClick={() =>
                                          lockGuess(match.id, question, match)
                                        }
                                        whileTap={{ scale: 0.97 }}
                                        className="w-full py-3 rounded-xl font-display font-bold text-sm transition-all"
                                        style={{
                                          background:
                                            "linear-gradient(135deg, oklch(0.72 0.18 50), oklch(0.76 0.2 40))",
                                          color: "oklch(0.12 0.02 50)",
                                          boxShadow:
                                            "0 4px 16px oklch(0.72 0.18 50 / 0.35)",
                                        }}
                                      >
                                        Guess · {GUESS_COST} 🪙
                                      </motion.button>
                                    )}
                                    {isLocked && (
                                      <motion.div
                                        key="cta-locked"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="w-full py-3 rounded-xl text-center"
                                        style={{
                                          background:
                                            "oklch(0.72 0.18 50 / 0.08)",
                                          border:
                                            "1px solid oklch(0.72 0.18 50 / 0.25)",
                                        }}
                                      >
                                        <p
                                          className="text-sm font-bold"
                                          style={{
                                            color: "oklch(0.82 0.14 60)",
                                          }}
                                        >
                                          ⏳ Awaiting Result...
                                        </p>
                                        <p
                                          className="text-xs mt-0.5"
                                          style={{
                                            color: "oklch(0.6 0.08 255)",
                                          }}
                                        >
                                          Locked in: {card.selected}
                                        </p>
                                      </motion.div>
                                    )}
                                    {isResolved && (
                                      <motion.div
                                        key="cta-resolved"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="w-full py-3 rounded-xl text-center"
                                        style={{
                                          background: isCorrect
                                            ? "oklch(0.62 0.2 140 / 0.12)"
                                            : "oklch(0.62 0.22 15 / 0.12)",
                                          border: `1px solid ${isCorrect ? "oklch(0.62 0.2 140 / 0.4)" : "oklch(0.62 0.22 15 / 0.4)"}`,
                                        }}
                                      >
                                        <p
                                          className="text-base font-bold font-display"
                                          style={{
                                            color: isCorrect
                                              ? "oklch(0.75 0.2 140)"
                                              : "oklch(0.75 0.22 15)",
                                          }}
                                        >
                                          {isCorrect
                                            ? `+${CORRECT_REWARD} 🪙 Correct!`
                                            : `Lost ${GUESS_COST} 🪙 Wrong!`}
                                        </p>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </>
                              )}
                            </motion.div>
                          );
                        })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* Tap hint */}
      {liveMatches.length > 0 && !selectedMatchId && (
        <p
          className="text-center text-xs"
          style={{ color: "oklch(0.5 0.05 255)" }}
        >
          Tap a match to open guess questions
        </p>
      )}

      {/* Disclaimer */}
      <p
        className="text-center text-xs px-4 pb-2"
        style={{ color: "oklch(0.45 0.04 255)" }}
      >
        ⚠️ This app is for entertainment only and not affiliated with any
        official cricket board.
      </p>
    </div>
  );
}
