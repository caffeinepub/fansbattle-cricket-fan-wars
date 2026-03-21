import TransactionHistory from "@/components/TransactionHistory";
import Shop from "@/components/tabs/Shop";
import { useUser } from "@/context/UserContext";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

const AD_COOLDOWN_SECONDS = 120;
const AD_DAILY_CAP = 3;

function getDateString() {
  return new Date().toISOString().slice(0, 10);
}

function getAdCooldownRemaining(): number {
  const lastAdTime = Number.parseInt(
    localStorage.getItem("fansbattle_last_ad_time") || "0",
  );
  const elapsed = Date.now() - lastAdTime;
  const remaining = AD_COOLDOWN_SECONDS * 1000 - elapsed;
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

function getAdCountToday(): number {
  const adDate = localStorage.getItem("fansbattle_ad_date");
  const today = getDateString();
  if (adDate !== today) return 0;
  return Number.parseInt(
    localStorage.getItem("fansbattle_ad_count_today") || "0",
  );
}

export default function ShopModal({ open, onClose }: Props) {
  const { addCoins, spendCoins, deviceId } = useUser();
  const [showHistory, setShowHistory] = useState(false);
  const [adRewardCollected, setAdRewardCollected] = useState(false);
  const [showAdSimulation, setShowAdSimulation] = useState(false);

  const handleWatchAd = () => {
    const cooldown = getAdCooldownRemaining();
    const count = getAdCountToday();

    if (count >= AD_DAILY_CAP) {
      toast.error("Daily ad limit reached. Come back tomorrow!");
      return;
    }
    if (cooldown > 0) {
      toast.error(`Wait ${cooldown}s before watching another ad.`);
      return;
    }
    setAdRewardCollected(false);
    setShowAdSimulation(true);
  };

  const handleAdComplete = async () => {
    if (adRewardCollected) return;
    setAdRewardCollected(true);
    setShowAdSimulation(false);

    const reward = Math.floor(Math.random() * 4) + 2;
    await addCoins(reward, "ad_reward");

    const now = Date.now();
    const today = getDateString();
    const count = getAdCountToday();
    localStorage.setItem("fansbattle_last_ad_time", String(now));
    localStorage.setItem("fansbattle_ad_date", today);
    localStorage.setItem("fansbattle_ad_count_today", String(count + 1));

    toast.success(`+${reward} coins from ad! 🪙`, { duration: 2500 });
    setTimeout(() => setAdRewardCollected(false), 2000);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            data-ocid="shop.modal"
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-0 z-50 flex flex-col app-shell"
            style={{
              background: "oklch(0.11 0.02 255)",
              maxWidth: "430px",
              margin: "0 auto",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 h-14 shrink-0"
              style={{
                borderBottom: "1px solid oklch(0.25 0.04 255 / 0.4)",
                background: "oklch(0.13 0.025 255 / 0.95)",
              }}
            >
              <span className="font-display font-700 text-foreground text-base">
                🛍️ Shop
              </span>
              <button
                type="button"
                data-ocid="shop.close_button"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors w-8 h-8 flex items-center justify-center rounded-full"
                style={{ background: "oklch(0.22 0.04 255)" }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <Shop
                addCoins={addCoins}
                spendCoins={spendCoins}
                onWatchAd={handleWatchAd}
                onViewHistory={() => setShowHistory(true)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ad simulation overlay */}
      <AnimatePresence>
        {showAdSimulation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
            style={{ background: "oklch(0.08 0.02 255 / 0.95)" }}
          >
            <div
              className="w-full max-w-[320px] rounded-3xl p-6 text-center space-y-4"
              style={{
                background: "oklch(0.17 0.03 255)",
                border: "1px solid oklch(0.3 0.05 255 / 0.4)",
              }}
            >
              <p className="text-3xl">📺</p>
              <p className="font-display font-700 text-foreground text-base">
                Ad Playing...
              </p>
              <p className="text-sm text-muted-foreground">
                Watch the full ad to earn coins
              </p>
              <button
                type="button"
                data-ocid="shop.ad_complete.button"
                onClick={handleAdComplete}
                className="w-full py-3 rounded-xl font-display font-700 text-sm"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.65 0.18 220), oklch(0.7 0.2 230))",
                  color: "white",
                }}
              >
                Collect Reward
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction History */}
      {deviceId && (
        <TransactionHistory
          userId={deviceId}
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
}
