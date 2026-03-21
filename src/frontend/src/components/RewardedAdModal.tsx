import { Progress } from "@/components/ui/progress";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onReward: () => void;
}

export default function RewardedAdModal({ isOpen, onClose, onReward }: Props) {
  const [countdown, setCountdown] = useState(5);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(5);
      setDone(false);
      return;
    }
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setDone(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [isOpen]);

  const handleCollect = () => {
    onReward();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          data-ocid="rewarded_ad.modal"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "oklch(0.05 0.02 255 / 0.92)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-sm rounded-3xl overflow-hidden"
            style={{
              background:
                "linear-gradient(160deg, oklch(0.18 0.06 255), oklch(0.14 0.04 240))",
              border: "1px solid oklch(0.35 0.12 255 / 0.4)",
              boxShadow: "0 24px 60px oklch(0.05 0.03 255 / 0.8)",
            }}
            initial={{ scale: 0.85, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            {/* Ad header */}
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{
                background: "oklch(0.12 0.04 255 / 0.6)",
                borderBottom: "1px solid oklch(0.35 0.12 255 / 0.2)",
              }}
            >
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded"
                style={{
                  background: "oklch(0.55 0.15 220 / 0.3)",
                  color: "oklch(0.75 0.15 220)",
                  border: "1px solid oklch(0.55 0.15 220 / 0.4)",
                  letterSpacing: "0.05em",
                }}
              >
                ADVERTISEMENT
              </span>
              <span
                className="text-xs"
                style={{ color: "oklch(0.55 0.05 220)" }}
              >
                {done ? "Ad complete" : `${countdown}s remaining`}
              </span>
            </div>

            {/* Fake ad content */}
            <div className="p-6 text-center">
              <div className="text-7xl mb-4">🏆</div>
              <div
                className="text-xl font-bold mb-1"
                style={{ color: "oklch(0.9 0.05 60)" }}
              >
                FanXpert Pro
              </div>
              <div
                className="text-sm mb-1"
                style={{ color: "oklch(0.75 0.08 220)" }}
              >
                The #1 Fantasy Cricket App in India
              </div>
              <div
                className="text-xs mb-6"
                style={{ color: "oklch(0.55 0.06 220)" }}
              >
                Create your dream team. Win real cash daily.
              </div>

              {!done && (
                <div className="mb-6">
                  <Progress
                    value={((5 - countdown) / 5) * 100}
                    className="h-2 mb-2"
                    style={{
                      background: "oklch(0.22 0.06 255 / 0.5)",
                    }}
                  />
                  <p
                    className="text-xs"
                    style={{ color: "oklch(0.55 0.05 220)" }}
                  >
                    Watch the full ad to earn your reward
                  </p>
                </div>
              )}

              {done && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-4 p-3 rounded-2xl text-center"
                  style={{
                    background: "oklch(0.72 0.22 50 / 0.12)",
                    border: "1px solid oklch(0.72 0.22 50 / 0.35)",
                  }}
                >
                  <p
                    className="text-sm font-bold"
                    style={{ color: "oklch(0.88 0.18 70)" }}
                  >
                    🎉 You earned 2-5 coins!
                  </p>
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  data-ocid="rewarded_ad.skip_button"
                  onClick={onClose}
                  disabled={!done}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold transition-opacity"
                  style={{
                    background: "oklch(0.22 0.06 255 / 0.5)",
                    color: done ? "oklch(0.7 0.05 220)" : "oklch(0.4 0.04 220)",
                    border: "1px solid oklch(0.35 0.08 255 / 0.3)",
                    cursor: done ? "pointer" : "not-allowed",
                  }}
                >
                  Skip
                </button>

                <button
                  type="button"
                  data-ocid="rewarded_ad.collect_button"
                  onClick={handleCollect}
                  disabled={!done}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold transition-all"
                  style={{
                    background: done
                      ? "linear-gradient(135deg, oklch(0.75 0.22 55), oklch(0.68 0.22 40))"
                      : "oklch(0.25 0.05 50 / 0.4)",
                    color: done ? "oklch(0.15 0.04 50)" : "oklch(0.4 0.04 50)",
                    cursor: done ? "pointer" : "not-allowed",
                    boxShadow: done
                      ? "0 4px 20px oklch(0.72 0.22 55 / 0.4)"
                      : "none",
                  }}
                >
                  Collect Reward 🪙
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
