import { Button } from "@/components/ui/button";
import { CheckCircle2, Coins, Flame, Lock, Star, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

const REWARD_DAYS = [
  { day: 1, coins: 5 },
  { day: 2, coins: 5 },
  { day: 3, coins: 5 },
  { day: 4, coins: 5 },
  { day: 5, coins: 5 },
];

interface DailyRewardModalProps {
  streakDay: number;
  coinsToEarn: number;
  onClaim: () => void;
  alreadyClaimed?: boolean;
  onClose?: () => void;
}

export default function DailyRewardModal({
  streakDay,
  coinsToEarn,
  onClaim,
  alreadyClaimed,
  onClose,
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
          <div
            className="h-1 w-full"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.75 0.22 55), oklch(0.82 0.2 75), oklch(0.75 0.22 55))",
            }}
          />

          <div className="p-6">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                data-ocid="daily_reward.close_button"
                className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                style={{
                  background: "oklch(0.25 0.04 250)",
                  border: "1px solid oklch(0.35 0.06 250)",
                  color: "oklch(0.6 0.06 250)",
                }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

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
                    <span
                      className="text-[10px] font-bold"
                      style={{
                        color: isActive
                          ? "oklch(0.88 0.18 80)"
                          : "oklch(0.55 0.06 250)",
                      }}
                    >
                      D{day}
                    </span>
                    <div className="text-lg">
                      {isCompleted ? (
                        <CheckCircle2
                          className="w-5 h-5"
                          style={{ color: "oklch(0.7 0.18 145)" }}
                        />
                      ) : isLocked ? (
                        <Lock
                          className="w-4 h-4"
                          style={{ color: "oklch(0.4 0.04 250)" }}
                        />
                      ) : isActive ? (
                        <Star
                          className="w-5 h-5"
                          style={{ color: "oklch(0.88 0.22 60)" }}
                        />
                      ) : (
                        <Coins
                          className="w-4 h-4"
                          style={{ color: "oklch(0.55 0.06 250)" }}
                        />
                      )}
                    </div>
                    <span
                      className="text-[9px] font-bold"
                      style={{
                        color: isActive
                          ? "oklch(0.82 0.2 70)"
                          : "oklch(0.45 0.05 250)",
                      }}
                    >
                      {coins}🪙
                    </span>
                  </motion.div>
                );
              })}
            </div>

            <div
              className="rounded-2xl p-4 text-center mb-5"
              style={{
                background: "oklch(0.2 0.06 55 / 0.4)",
                border: "1px solid oklch(0.65 0.2 55 / 0.3)",
              }}
            >
              <p
                className="text-sm font-semibold"
                style={{ color: "oklch(0.75 0.1 80)" }}
              >
                Today's Reward
              </p>
              <p
                className="text-4xl font-black mt-1"
                style={{ color: "oklch(0.9 0.2 70)" }}
              >
                +{coinsToEarn} 🪙
              </p>
            </div>

            {alreadyClaimed ? (
              <div
                className="rounded-2xl p-4 text-center"
                style={{
                  background: "oklch(0.18 0.04 250)",
                  border: "1px solid oklch(0.3 0.06 250)",
                }}
              >
                <p
                  className="text-sm font-semibold"
                  style={{ color: "oklch(0.65 0.08 250)" }}
                >
                  ✓ Already claimed today
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "oklch(0.5 0.06 250)" }}
                >
                  Come back tomorrow!
                </p>
              </div>
            ) : (
              <Button
                data-ocid="daily_reward.claim_button"
                onClick={onClaim}
                className="w-full h-14 text-lg font-black tracking-wide"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.82 0.22 55), oklch(0.75 0.24 40))",
                  color: "oklch(0.12 0.03 50)",
                  boxShadow: "0 6px 28px oklch(0.75 0.22 55 / 0.5)",
                }}
              >
                🎁 Claim +{coinsToEarn} Coins
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
