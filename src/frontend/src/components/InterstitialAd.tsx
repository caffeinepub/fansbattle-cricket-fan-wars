import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function InterstitialAd({ isOpen, onClose }: Props) {
  const [skipCountdown, setSkipCountdown] = useState(3);
  const [canSkip, setCanSkip] = useState(false);
  const skipTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSkipCountdown(3);
      setCanSkip(false);
      return;
    }

    skipTimerRef.current = setInterval(() => {
      setSkipCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(skipTimerRef.current!);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    autoCloseRef.current = setTimeout(() => {
      onClose();
    }, 8000);

    return () => {
      clearInterval(skipTimerRef.current!);
      clearTimeout(autoCloseRef.current!);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          data-ocid="interstitial_ad.overlay"
          className="fixed inset-0 z-[300] flex flex-col items-center justify-center"
          style={{
            background:
              "linear-gradient(160deg, oklch(0.10 0.06 255), oklch(0.08 0.04 240))",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Ad badge top-left */}
          <div className="absolute top-4 left-4">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded"
              style={{
                background: "oklch(0.22 0.06 255 / 0.5)",
                color: "oklch(0.55 0.08 220)",
                border: "1px solid oklch(0.35 0.08 255 / 0.3)",
                letterSpacing: "0.05em",
              }}
            >
              AD
            </span>
          </div>

          {/* Skip countdown top-right */}
          <div className="absolute top-4 right-4">
            {canSkip ? (
              <button
                type="button"
                data-ocid="interstitial_ad.skip_button"
                onClick={onClose}
                className="text-sm font-bold px-4 py-2 rounded-full"
                style={{
                  background: "oklch(0.22 0.06 255 / 0.8)",
                  color: "oklch(0.85 0.05 220)",
                  border: "1px solid oklch(0.45 0.1 220 / 0.5)",
                }}
              >
                Skip ✕
              </button>
            ) : (
              <span
                className="text-sm font-bold px-4 py-2 rounded-full"
                style={{
                  background: "oklch(0.18 0.04 255 / 0.6)",
                  color: "oklch(0.5 0.05 220)",
                  border: "1px solid oklch(0.3 0.06 255 / 0.3)",
                }}
              >
                Skip in {skipCountdown}…
              </span>
            )}
          </div>

          {/* Main ad content */}
          <motion.div
            className="text-center px-8 max-w-sm"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          >
            <div className="text-[100px] leading-none mb-6">🏟️</div>

            <div
              className="text-3xl font-bold mb-2"
              style={{ color: "oklch(0.9 0.06 60)" }}
            >
              CricketPro Fantasy
            </div>
            <div
              className="text-base mb-2"
              style={{ color: "oklch(0.72 0.1 220)" }}
            >
              Predict. Compete. Win.
            </div>
            <div
              className="text-sm mb-8"
              style={{ color: "oklch(0.55 0.06 220)" }}
            >
              Join 50 lakh+ cricket fans already winning big
            </div>

            <button
              type="button"
              className="px-10 py-4 rounded-2xl text-base font-bold"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.75 0.22 55), oklch(0.68 0.22 38))",
                color: "oklch(0.15 0.04 50)",
                boxShadow: "0 8px 32px oklch(0.72 0.22 55 / 0.5)",
              }}
            >
              Play Now 🏏
            </button>
          </motion.div>

          {/* Bottom disclaimer */}
          <div
            className="absolute bottom-6 text-[10px]"
            style={{ color: "oklch(0.35 0.04 220)" }}
          >
            Advertisement · Simulated for demo purposes
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
