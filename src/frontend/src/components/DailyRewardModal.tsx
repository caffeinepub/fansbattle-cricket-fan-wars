import { Button } from "@/components/ui/button";
import { CheckCircle2, Coins, Flame, Lock, Star } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

const REWARD_DAYS = [
  { day: 1, coins: 20 },
  { day: 2, coins: 30 },
  { day: 3, coins: 50 },
  { day: 4, coins: 70 },
  { day: 5, coins: 100 },
];

interface DailyRewardModalProps {
  streakDay: number;
  coinsToEarn: number;
  onClaim: () => void;
}

export default function DailyRewardModal({
  streakDay,
  coinsToEarn,
  onClaim,
}: DailyRewardModalProps) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.85)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        data-ocid="daily_reward.modal"
      >
        {/* Backdrop blur layer */}
        <div className="absolute inset-0 backdrop-blur-sm" />

        <motion.div
          className="relative w-full max-w-sm rounded-2xl overflow-hidden"
          style={{
            background:
              "linear-gradient(160deg, oklch(0.18 0.04 250), oklch(0.12 0.02 250))",
            border: "1px solid oklch(0.35 0.12 50 / 0.5)",
            boxShadow:
              "0 0 60px oklch(0.7 0.25 60 / 0.25), 0 24px 48px rgba(0,0,0,0.6)",
          }}
          initial={{ scale: 0.7, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {/* Header glow bar */}
          <div
            className="h-1 w-full"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.75 0.22 55), oklch(0.82 0.2 75), oklch(0.75 0.22 55))",
            }}
          />

          <div className="p-6">
            {/* Title */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Flame
                  className="w-7 h-7"
                  style={{ color: "oklch(0.78 0.23 55)" }}
                />
                <h2
                  className="text-2xl font-bold tracking-tight"
                  style={{
                    color: "oklch(0.95 0.04 80)",
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                  }}
                >
                  Daily Reward
                </h2>
                <Flame
                  className="w-7 h-7"
                  style={{ color: "oklch(0.78 0.23 55)" }}
                />
              </div>
              <p className="text-sm" style={{ color: "oklch(0.72 0.08 250)" }}>
                🔥 Day {streakDay} Streak! Keep logging in daily!
              </p>
            </div>

            {/* Day Cards Row */}
            <div className="flex gap-2 mb-6 justify-between">
              {REWARD_DAYS.map(({ day, coins }) => {
                const isCompleted = day < streakDay;
                const isActive = day === streakDay;
                const isLocked = day > streakDay;

                return (
                  <motion.div
                    key={day}
                    data-ocid={`daily_reward.day.${day}`}
                    className="flex-1 flex flex-col items-center rounded-xl p-2 gap-1 relative overflow-hidden"
                    style={{
                      background: isActive
                        ? "oklch(0.22 0.08 55)"
                        : isCompleted
                          ? "oklch(0.17 0.03 250)"
                          : "oklch(0.14 0.02 250)",
                      border: isActive
                        ? "1px solid oklch(0.75 0.22 55)"
                        : isCompleted
                          ? "1px solid oklch(0.28 0.05 250)"
                          : "1px solid oklch(0.22 0.03 250)",
                      boxShadow: isActive
                        ? "0 0 16px oklch(0.75 0.22 55 / 0.4), inset 0 0 12px oklch(0.75 0.22 55 / 0.1)"
                        : "none",
                    }}
                    animate={isActive ? { scale: [1, 1.04, 1] } : {}}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  >
                    {isActive && (
                      <div
                        className="absolute inset-0 opacity-20"
                        style={{
                          background:
                            "radial-gradient(circle at 50% 0%, oklch(0.82 0.22 60), transparent 70%)",
                        }}
                      />
                    )}
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color: isActive
                          ? "oklch(0.82 0.18 60)"
                          : isCompleted
                            ? "oklch(0.55 0.08 250)"
                            : "oklch(0.45 0.05 250)",
                      }}
                    >
                      Day {day}
                    </span>
                    <div className="text-lg">
                      {isCompleted ? (
                        <CheckCircle2
                          className="w-5 h-5"
                          style={{ color: "oklch(0.72 0.18 145)" }}
                        />
                      ) : isLocked ? (
                        <Lock
                          className="w-4 h-4"
                          style={{ color: "oklch(0.4 0.05 250)" }}
                        />
                      ) : (
                        <Star
                          className="w-5 h-5"
                          style={{ color: "oklch(0.82 0.22 60)" }}
                          fill="oklch(0.82 0.22 60)"
                        />
                      )}
                    </div>
                    <span
                      className="text-xs font-bold"
                      style={{
                        color: isActive
                          ? "oklch(0.92 0.15 75)"
                          : isCompleted
                            ? "oklch(0.5 0.06 250)"
                            : "oklch(0.38 0.04 250)",
                      }}
                    >
                      {coins}🪙
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Today's Reward Hero */}
            <motion.div
              className="rounded-xl p-5 text-center mb-5 relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.2 0.1 55), oklch(0.16 0.06 55))",
                border: "1px solid oklch(0.6 0.18 55 / 0.4)",
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  background:
                    "radial-gradient(circle at 50% 50%, oklch(0.9 0.25 60), transparent 60%)",
                }}
              />
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-1"
                style={{ color: "oklch(0.65 0.12 60)" }}
              >
                Today's Reward
              </p>
              <div className="flex items-center justify-center gap-3">
                <Coins
                  className="w-10 h-10"
                  style={{ color: "oklch(0.82 0.22 75)" }}
                />
                <span
                  className="text-5xl font-black"
                  style={{
                    color: "oklch(0.92 0.2 75)",
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    textShadow: "0 0 20px oklch(0.82 0.22 75 / 0.5)",
                  }}
                >
                  +{coinsToEarn}
                </span>
                <span
                  className="text-2xl font-bold"
                  style={{ color: "oklch(0.75 0.18 75)" }}
                >
                  🪙
                </span>
              </div>
            </motion.div>

            {/* Claim Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <Button
                onClick={onClaim}
                className="w-full h-14 text-lg font-bold tracking-wide rounded-xl relative overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.72 0.22 50), oklch(0.65 0.25 40))",
                  color: "oklch(0.12 0.02 50)",
                  boxShadow:
                    "0 4px 20px oklch(0.7 0.22 50 / 0.5), inset 0 1px 0 oklch(0.88 0.15 65 / 0.4)",
                  border: "none",
                }}
                data-ocid="daily_reward.claim_button"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Flame className="w-5 h-5" />
                  Claim Reward
                </span>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
