import { getTransactions } from "@/lib/firestore";
import { Coins, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  timestamp: unknown;
  roomId?: string | null;
}

interface TransactionHistoryProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  daily_reward: { label: "Daily Reward", emoji: "🔥" },
  coin_purchase: { label: "Coin Purchase", emoji: "💳" },
  guess_win: { label: "Prediction Win", emoji: "🏆" },
  guess_entry: { label: "Prediction Entry", emoji: "🎯" },
  ad_reward: { label: "Ad Reward", emoji: "📺" },
  spin_win: { label: "Spin Win", emoji: "🎡" },
  spin_wheel: { label: "Spin Wheel", emoji: "🎰" },
  room_entry: { label: "Room Entry", emoji: "🚪" },
  room_win: { label: "Room Win", emoji: "🏆" },
  invite_reward: { label: "Invite Reward", emoji: "👥" },
};

function getTypeInfo(type: string) {
  return TYPE_LABELS[type] ?? { label: type.replace(/_/g, " "), emoji: "🪙" };
}

function formatTimestamp(ts: unknown): string {
  if (!ts) return "Just now";
  // Firestore Timestamp
  if (typeof ts === "object" && ts !== null && "toDate" in ts) {
    return (ts as { toDate: () => Date }).toDate().toLocaleString();
  }
  if (typeof ts === "string" || typeof ts === "number") {
    return new Date(ts).toLocaleString();
  }
  return "";
}

export default function TransactionHistory({
  userId,
  isOpen,
  onClose,
}: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !userId) return;
    setLoading(true);
    setError(null);
    getTransactions(userId)
      .then(setTransactions)
      .catch(() => setError("Could not load transactions."))
      .finally(() => setLoading(false));
  }, [isOpen, userId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: "rgba(0,0,0,0.92)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-ocid="transaction_history.modal"
        >
          <div className="absolute inset-0 backdrop-blur-sm" />

          <motion.div
            className="relative flex flex-col w-full max-w-md mx-auto h-full"
            style={{
              background:
                "linear-gradient(180deg, oklch(0.14 0.04 250), oklch(0.10 0.02 250))",
            }}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Header glow bar */}
            <div
              className="h-1 w-full flex-shrink-0"
              style={{
                background:
                  "linear-gradient(90deg, oklch(0.75 0.22 55), oklch(0.82 0.2 75), oklch(0.75 0.22 55))",
              }}
            />

            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{
                borderBottom: "1px solid oklch(0.25 0.04 250)",
              }}
            >
              <div className="flex items-center gap-2">
                <Coins
                  className="w-6 h-6"
                  style={{ color: "oklch(0.82 0.22 75)" }}
                />
                <h2
                  className="text-xl font-bold"
                  style={{
                    color: "oklch(0.95 0.04 80)",
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                  }}
                >
                  Transaction History
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                data-ocid="transaction_history.close_button"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{
                  background: "oklch(0.22 0.04 250)",
                  border: "1px solid oklch(0.32 0.06 250)",
                  color: "oklch(0.65 0.08 250)",
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {loading && (
                <div
                  className="flex flex-col items-center justify-center py-16"
                  data-ocid="transaction_history.loading_state"
                >
                  <div className="text-4xl mb-3 animate-bounce">🪙</div>
                  <p
                    className="text-sm"
                    style={{ color: "oklch(0.6 0.08 250)" }}
                  >
                    Loading transactions...
                  </p>
                </div>
              )}

              {error && !loading && (
                <div
                  className="flex flex-col items-center justify-center py-16"
                  data-ocid="transaction_history.error_state"
                >
                  <div className="text-4xl mb-3">⚠️</div>
                  <p
                    className="text-sm"
                    style={{ color: "oklch(0.65 0.18 25)" }}
                  >
                    {error}
                  </p>
                </div>
              )}

              {!loading && !error && transactions.length === 0 && (
                <div
                  className="flex flex-col items-center justify-center py-16"
                  data-ocid="transaction_history.empty_state"
                >
                  <div className="text-5xl mb-3">📜</div>
                  <p
                    className="text-base font-semibold"
                    style={{ color: "oklch(0.7 0.06 250)" }}
                  >
                    No transactions yet
                  </p>
                  <p
                    className="text-sm mt-1"
                    style={{ color: "oklch(0.5 0.04 250)" }}
                  >
                    Claim rewards and play to see your history!
                  </p>
                </div>
              )}

              {!loading &&
                !error &&
                transactions.map((tx, idx) => {
                  const { label, emoji } = getTypeInfo(tx.type);
                  const isPositive = tx.amount >= 0;
                  return (
                    <motion.div
                      key={tx.id}
                      data-ocid={`transaction_history.item.${idx + 1}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="flex items-center justify-between rounded-xl px-4 py-3"
                      style={{
                        background: isPositive
                          ? "oklch(0.18 0.05 140 / 0.4)"
                          : "oklch(0.18 0.05 25 / 0.4)",
                        border: isPositive
                          ? "1px solid oklch(0.35 0.1 140 / 0.3)"
                          : "1px solid oklch(0.35 0.1 25 / 0.3)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{emoji}</span>
                        <div>
                          <p
                            className="text-sm font-semibold capitalize"
                            style={{ color: "oklch(0.88 0.05 250)" }}
                          >
                            {label}
                          </p>
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: "oklch(0.5 0.04 250)" }}
                          >
                            {formatTimestamp(tx.timestamp)}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-base font-bold"
                        style={{
                          color: isPositive
                            ? "oklch(0.75 0.2 145)"
                            : "oklch(0.65 0.2 25)",
                        }}
                      >
                        {isPositive ? "+" : ""}
                        {tx.amount} 🪙
                      </span>
                    </motion.div>
                  );
                })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
