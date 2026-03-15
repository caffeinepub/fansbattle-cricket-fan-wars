import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  addCoins: (n: number) => void;
}

interface Poll {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  percentA: number;
  emojiA: string;
  emojiB: string;
}

const POLLS: Poll[] = [
  {
    id: 1,
    question: "GOAT of Cricket?",
    optionA: "Sachin Tendulkar",
    optionB: "Virat Kohli",
    percentA: 67,
    emojiA: "🐐",
    emojiB: "👑",
  },
  {
    id: 2,
    question: "Best T20 Team?",
    optionA: "India",
    optionB: "Australia",
    percentA: 54,
    emojiA: "🇮🇳",
    emojiB: "🇦🇺",
  },
  {
    id: 3,
    question: "Best Captain Ever?",
    optionA: "MS Dhoni",
    optionB: "Ricky Ponting",
    percentA: 71,
    emojiA: "🧢",
    emojiB: "⚡",
  },
  {
    id: 4,
    question: "Most Exciting Batsman?",
    optionA: "Rohit Sharma",
    optionB: "David Warner",
    percentA: 48,
    emojiA: "🚀",
    emojiB: "🔥",
  },
];

export default function VoteBattle({ addCoins }: Props) {
  const [voted, setVoted] = useState<Record<number, "A" | "B">>({});
  const [percents, setPercents] = useState<Record<number, number>>({});

  const handleVote = (poll: Poll, choice: "A" | "B") => {
    if (voted[poll.id]) return;
    setVoted((prev) => ({ ...prev, [poll.id]: choice }));
    const newPercent =
      choice === "A"
        ? Math.min(poll.percentA + 2, 95)
        : Math.max(poll.percentA - 2, 5);
    setPercents((prev) => ({ ...prev, [poll.id]: newPercent }));
    addCoins(3);
    toast.success("🪙 +3 coins! Vote registered!", { duration: 2000 });
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">⚔️</span>
        <div>
          <h2 className="font-display text-xl font-800 text-foreground">
            Vote Battle
          </h2>
          <p className="text-xs text-muted-foreground">
            Cast your vote. Earn coins.
          </p>
        </div>
      </div>

      {POLLS.map((poll, idx) => {
        const pA = percents[poll.id] ?? poll.percentA;
        const pB = 100 - pA;
        const myVote = voted[poll.id];

        return (
          <motion.div
            key={poll.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.08 }}
            className="card-glass rounded-2xl p-4"
          >
            <h3 className="font-display text-base font-700 text-foreground mb-3 text-center">
              {poll.question}
            </h3>

            {/* Options Row */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => handleVote(poll, "A")}
                disabled={!!myVote}
                className="flex-1 py-3 rounded-xl text-center transition-all duration-200 font-600 text-sm"
                style={{
                  background:
                    myVote === "A"
                      ? "linear-gradient(135deg, oklch(0.65 0.18 220), oklch(0.7 0.2 230))"
                      : "oklch(0.22 0.04 255)",
                  border: `1px solid ${myVote === "A" ? "oklch(0.65 0.18 220)" : "oklch(0.3 0.04 255)"}`,
                  color: myVote === "A" ? "white" : "oklch(0.8 0.04 255)",
                  boxShadow:
                    myVote === "A"
                      ? "0 0 12px oklch(0.65 0.18 220 / 0.5)"
                      : "none",
                }}
              >
                <span className="block text-lg">{poll.emojiA}</span>
                <span className="text-xs leading-tight">{poll.optionA}</span>
              </button>

              <div className="flex items-center justify-center w-8">
                <span className="text-xs font-800 text-muted-foreground">
                  VS
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleVote(poll, "B")}
                disabled={!!myVote}
                className="flex-1 py-3 rounded-xl text-center transition-all duration-200 font-600 text-sm"
                style={{
                  background:
                    myVote === "B"
                      ? "linear-gradient(135deg, oklch(0.72 0.18 50), oklch(0.78 0.2 40))"
                      : "oklch(0.22 0.04 255)",
                  border: `1px solid ${myVote === "B" ? "oklch(0.72 0.18 50)" : "oklch(0.3 0.04 255)"}`,
                  color:
                    myVote === "B"
                      ? "oklch(0.12 0.02 240)"
                      : "oklch(0.8 0.04 255)",
                  boxShadow:
                    myVote === "B"
                      ? "0 0 12px oklch(0.72 0.18 50 / 0.5)"
                      : "none",
                }}
              >
                <span className="block text-lg">{poll.emojiB}</span>
                <span className="text-xs leading-tight">{poll.optionB}</span>
              </button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span style={{ color: "oklch(0.75 0.15 220)" }}>{pA}%</span>
                <span style={{ color: "oklch(0.78 0.16 50)" }}>{pB}%</span>
              </div>
              <div
                className="h-2.5 rounded-full overflow-hidden flex"
                style={{ background: "oklch(0.22 0.04 255)" }}
              >
                <motion.div
                  className="h-full progress-fill-blue"
                  initial={{ width: `${poll.percentA}%` }}
                  animate={{ width: `${pA}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
                <motion.div
                  className="h-full progress-fill-orange"
                  initial={{ width: `${100 - poll.percentA}%` }}
                  animate={{ width: `${pB}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Vote Button */}
            {!myVote ? (
              <button
                type="button"
                data-ocid={`vote_battle.poll.button.${idx + 1}`}
                onClick={() => handleVote(poll, "A")}
                className="mt-3 w-full py-2 rounded-xl text-sm font-700 font-display text-muted-foreground transition-colors hover:text-foreground"
                style={{
                  background: "oklch(0.22 0.04 255)",
                  border: "1px solid oklch(0.3 0.04 255)",
                }}
              >
                Vote & Earn 3 🪙
              </button>
            ) : (
              <div
                className="mt-3 w-full py-2 rounded-xl text-sm font-700 font-display text-center"
                style={{
                  background: "oklch(0.62 0.2 140 / 0.15)",
                  color: "oklch(0.72 0.15 140)",
                  border: "1px solid oklch(0.62 0.2 140 / 0.3)",
                }}
              >
                ✅ Voted for {myVote === "A" ? poll.optionA : poll.optionB}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
