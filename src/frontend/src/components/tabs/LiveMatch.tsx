import { Badge } from "@/components/ui/badge";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Props {
  addCoins: (n: number) => void;
  spendCoins: (n: number) => boolean;
}

const GUESS_COST = 10;
const CORRECT_REWARD = 25;

type CardState = "idle" | "locked" | "resolved";

interface GuessEvent {
  id: number;
  question: string;
  options: string[];
  emoji: string;
  timer: number;
}

const EVENTS: GuessEvent[] = [
  {
    id: 1,
    question: "Who will win the match?",
    options: ["India", "Australia"],
    emoji: "🏆",
    timer: 60,
  },
  {
    id: 2,
    question: "Next wicket — which player?",
    options: ["Virat Kohli", "Rohit Sharma", "Steve Smith", "David Warner"],
    emoji: "🎳",
    timer: 45,
  },
  {
    id: 3,
    question: "Next six — who hits it?",
    options: ["Hardik Pandya", "MS Dhoni", "Glenn Maxwell", "Pat Cummins"],
    emoji: "💥",
    timer: 30,
  },
  {
    id: 4,
    question: "Over runs above 10?",
    options: ["Yes", "No"],
    emoji: "📊",
    timer: 45,
  },
  {
    id: 5,
    question: "Next ball — boundary or dot?",
    options: ["Boundary (4)", "Boundary (6)", "Dot Ball", "Single"],
    emoji: "🎯",
    timer: 20,
  },
];

function formatTime(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  return `${seconds}s`;
}

interface CardData {
  state: CardState;
  selected: string | null;
  timeLeft: number;
  isCorrect: boolean | null;
}

export default function LiveMatch({ addCoins, spendCoins }: Props) {
  const [cards, setCards] = useState<Record<number, CardData>>(() =>
    Object.fromEntries(
      EVENTS.map((e) => [
        e.id,
        {
          state: "idle" as CardState,
          selected: null,
          timeLeft: e.timer,
          isCorrect: null,
        },
      ]),
    ),
  );

  const intervals = useRef<Record<number, ReturnType<typeof setInterval>>>({});

  useEffect(() => {
    return () => {
      Object.values(intervals.current).forEach(clearInterval);
    };
  }, []);

  const selectOption = (eventId: number, option: string) => {
    setCards((prev) => {
      if (prev[eventId].state !== "idle") return prev;
      return { ...prev, [eventId]: { ...prev[eventId], selected: option } };
    });
  };

  const lockGuess = (eventId: number) => {
    const card = cards[eventId];
    if (!card.selected) {
      toast.error("Select an option first!");
      return;
    }
    if (!spendCoins(GUESS_COST)) {
      toast.error("Not enough coins!");
      return;
    }

    setCards((prev) => ({
      ...prev,
      [eventId]: { ...prev[eventId], state: "locked" },
    }));

    const event = EVENTS.find((e) => e.id === eventId)!;
    let remaining = event.timer;

    const interval = setInterval(() => {
      remaining -= 1;
      setCards((prev) => ({
        ...prev,
        [eventId]: { ...prev[eventId], timeLeft: remaining },
      }));

      if (remaining <= 0) {
        clearInterval(interval);
        delete intervals.current[eventId];

        const correct = Math.random() < 0.5;
        if (correct) addCoins(CORRECT_REWARD);

        setCards((prev) => ({
          ...prev,
          [eventId]: {
            ...prev[eventId],
            state: "resolved",
            isCorrect: correct,
            timeLeft: 0,
          },
        }));

        if (correct) {
          toast.success(`🏏 Correct! +${CORRECT_REWARD} 🪙`, {
            duration: 3000,
          });
        } else {
          toast.error(`❌ Wrong guess! Lost ${GUESS_COST} 🪙`, {
            duration: 3000,
          });
        }
      }
    }, 1000);

    intervals.current[eventId] = interval;
  };

  return (
    <div className="px-4 py-4 space-y-4 pb-24">
      {/* Live Match Score Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-glass rounded-2xl overflow-hidden"
      >
        <div
          className="relative h-36"
          style={{
            backgroundImage: `url('/assets/generated/stadium-bg.dim_430x200.jpg')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, oklch(0.13 0.025 255 / 0.3), oklch(0.13 0.025 255 / 0.9))",
            }}
          />
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <Badge
              className="text-xs font-bold px-2 py-0.5 flex items-center gap-1"
              style={{
                background: "oklch(0.62 0.22 15)",
                color: "white",
                border: "none",
              }}
            >
              <span className="live-dot" /> LIVE
            </Badge>
            <span
              className="text-xs font-semibold"
              style={{ color: "oklch(0.75 0.18 90)" }}
            >
              ICC World Cup 2026
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <p
                  className="font-display text-xs font-semibold uppercase tracking-widest mb-0.5"
                  style={{ color: "oklch(0.75 0.06 255)" }}
                >
                  IND
                </p>
                <p
                  className="font-display text-3xl font-bold"
                  style={{ color: "oklch(0.95 0.04 255)" }}
                >
                  287/6
                </p>
                <p
                  className="text-xs"
                  style={{ color: "oklch(0.65 0.05 255)" }}
                >
                  45.2 ov
                </p>
              </div>
              <div className="flex flex-col items-center px-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: "oklch(0.22 0.04 255 / 0.8)",
                    border: "1px solid oklch(0.35 0.06 255)",
                    color: "oklch(0.7 0.06 255)",
                  }}
                >
                  VS
                </div>
                <p
                  className="text-xs mt-1"
                  style={{ color: "oklch(0.65 0.05 255)" }}
                >
                  CRR 6.3
                </p>
              </div>
              <div className="text-center flex-1">
                <p
                  className="font-display text-xs font-semibold uppercase tracking-widest mb-0.5"
                  style={{ color: "oklch(0.75 0.06 255)" }}
                >
                  AUS
                </p>
                <p
                  className="font-display text-3xl font-bold"
                  style={{ color: "oklch(0.88 0.18 90)" }}
                >
                  245/8
                </p>
                <p
                  className="text-xs"
                  style={{ color: "oklch(0.65 0.05 255)" }}
                >
                  40.0 ov
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          className="px-4 py-2 flex items-center justify-between text-xs"
          style={{
            background: "oklch(0.18 0.04 255 / 0.6)",
            borderTop: "1px solid oklch(0.3 0.05 255 / 0.4)",
          }}
        >
          <span style={{ color: "oklch(0.7 0.06 255)" }}>
            🏏 Virat Kohli 52* (41)
          </span>
          <span style={{ color: "oklch(0.88 0.18 90)" }}>
            IND need 42 to win
          </span>
        </div>
      </motion.div>

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3
          className="font-display text-sm font-bold uppercase tracking-widest"
          style={{ color: "oklch(0.7 0.08 255)" }}
        >
          🎯 Guess & Earn
        </h3>
        <div
          className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{
            background: "oklch(0.72 0.18 50 / 0.15)",
            color: "oklch(0.82 0.18 60)",
            border: "1px solid oklch(0.72 0.18 50 / 0.3)",
          }}
        >
          10 🪙 per guess
        </div>
      </div>

      {/* Guess Cards */}
      {EVENTS.map((event, idx) => {
        const card = cards[event.id];
        const isIdle = card.state === "idle";
        const isLocked = card.state === "locked";
        const isResolved = card.state === "resolved";
        const isCorrect = card.isCorrect;

        const glowStyle = isResolved
          ? isCorrect
            ? {
                boxShadow:
                  "0 0 24px oklch(0.62 0.2 140 / 0.5), 0 0 1px oklch(0.62 0.2 140)",
              }
            : {
                boxShadow:
                  "0 0 24px oklch(0.62 0.22 15 / 0.5), 0 0 1px oklch(0.62 0.22 15)",
              }
          : {};

        return (
          <motion.div
            key={event.id}
            data-ocid={`live_match.guess.card.${idx + 1}`}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: idx * 0.08,
              type: "spring",
              stiffness: 280,
              damping: 22,
            }}
            className="card-glass rounded-2xl p-4"
            style={glowStyle}
          >
            {/* Card Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-2 flex-1">
                <span className="text-2xl leading-none mt-0.5">
                  {event.emoji}
                </span>
                <p
                  className="font-display text-sm font-bold leading-snug"
                  style={{ color: "oklch(0.92 0.04 255)" }}
                >
                  {event.question}
                </p>
              </div>
              {/* Timer badge */}
              <AnimatePresence mode="wait">
                {isIdle && (
                  <motion.div
                    key="idle-timer"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="ml-2 flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full"
                    style={{
                      background: "oklch(0.72 0.18 50 / 0.15)",
                      color: "oklch(0.82 0.18 55)",
                      border: "1px solid oklch(0.72 0.18 50 / 0.4)",
                    }}
                  >
                    ⏱ {formatTime(event.timer)}
                  </motion.div>
                )}
                {isLocked && (
                  <motion.div
                    key="locked-timer"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="ml-2 flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full"
                    style={{
                      background:
                        card.timeLeft <= 10
                          ? "oklch(0.62 0.22 15 / 0.2)"
                          : "oklch(0.72 0.18 50 / 0.15)",
                      color:
                        card.timeLeft <= 10
                          ? "oklch(0.75 0.2 15)"
                          : "oklch(0.82 0.18 55)",
                      border: `1px solid ${
                        card.timeLeft <= 10
                          ? "oklch(0.62 0.22 15 / 0.4)"
                          : "oklch(0.72 0.18 50 / 0.4)"
                      }`,
                    }}
                  >
                    ⏱ {formatTime(card.timeLeft)}
                  </motion.div>
                )}
                {isResolved && (
                  <motion.div
                    key="resolved-badge"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="ml-2 flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full"
                    style={{
                      background: isCorrect
                        ? "oklch(0.62 0.2 140 / 0.2)"
                        : "oklch(0.62 0.22 15 / 0.2)",
                      color: isCorrect
                        ? "oklch(0.75 0.18 140)"
                        : "oklch(0.75 0.2 15)",
                      border: `1px solid ${
                        isCorrect
                          ? "oklch(0.62 0.2 140 / 0.4)"
                          : "oklch(0.62 0.22 15 / 0.4)"
                      }`,
                    }}
                  >
                    {isCorrect ? "✅ Won" : "❌ Lost"}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {event.options.map((opt, optIdx) => {
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
                  shadow = "0 0 10px oklch(0.65 0.18 230 / 0.35)";
                } else if (isSelected && isLocked) {
                  bgColor = "oklch(0.72 0.18 50 / 0.15)";
                  borderColor = "oklch(0.72 0.18 50 / 0.6)";
                  textColor = "oklch(0.88 0.16 60)";
                  shadow = "0 0 10px oklch(0.72 0.18 50 / 0.3)";
                } else if (isSelected && isResolved) {
                  if (isCorrect) {
                    bgColor = "oklch(0.62 0.2 140 / 0.2)";
                    borderColor = "oklch(0.62 0.2 140)";
                    textColor = "oklch(0.78 0.16 140)";
                    shadow = "0 0 10px oklch(0.62 0.2 140 / 0.4)";
                  } else {
                    bgColor = "oklch(0.62 0.22 15 / 0.2)";
                    borderColor = "oklch(0.62 0.22 15)";
                    textColor = "oklch(0.78 0.18 15)";
                    shadow = "0 0 10px oklch(0.62 0.22 15 / 0.4)";
                  }
                }

                return (
                  <button
                    key={opt}
                    type="button"
                    data-ocid={`live_match.guess.button.${idx + 1}`}
                    onClick={() => selectOption(event.id, opt)}
                    disabled={isDisabled}
                    className="text-left text-sm px-3 py-2.5 rounded-xl transition-all duration-200 font-semibold"
                    style={{
                      background: bgColor,
                      border: `1px solid ${borderColor}`,
                      color: textColor,
                      boxShadow: shadow,
                      opacity: isDisabled && !isSelected ? 0.45 : 1,
                      cursor: isDisabled ? "default" : "pointer",
                    }}
                  >
                    <span
                      className="text-xs font-bold mr-1"
                      style={{ color: "oklch(0.55 0.06 255)" }}
                    >
                      {String.fromCharCode(65 + optIdx)}.
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* CTA Area */}
            <AnimatePresence mode="wait">
              {isIdle && (
                <motion.button
                  key="cta-guess"
                  data-ocid={`live_match.guess.submit_button.${idx + 1}`}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  onClick={() => lockGuess(event.id)}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.01 }}
                  className="w-full py-3 rounded-xl font-display font-bold text-sm transition-all"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.72 0.18 50), oklch(0.76 0.2 40))",
                    color: "oklch(0.12 0.02 50)",
                    boxShadow: "0 4px 16px oklch(0.72 0.18 50 / 0.35)",
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
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full py-3 rounded-xl text-center"
                  style={{
                    background: "oklch(0.72 0.18 50 / 0.08)",
                    border: "1px solid oklch(0.72 0.18 50 / 0.25)",
                  }}
                >
                  <p
                    className="text-sm font-bold"
                    style={{ color: "oklch(0.82 0.14 60)" }}
                  >
                    ⏳ Awaiting Result...
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "oklch(0.6 0.08 255)" }}
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
                    border: `1px solid ${
                      isCorrect
                        ? "oklch(0.62 0.2 140 / 0.4)"
                        : "oklch(0.62 0.22 15 / 0.4)"
                    }`,
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
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "oklch(0.6 0.06 255)" }}
                  >
                    {isCorrect
                      ? "Great prediction! 🏏"
                      : `Answer was locked: ${card.selected}`}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {/* Footer Note */}
      <p
        className="text-center text-xs pb-2"
        style={{ color: "oklch(0.5 0.05 255)" }}
      >
        Entry: {GUESS_COST} 🪙 · Correct reward: {CORRECT_REWARD} 🪙
      </p>
    </div>
  );
}
