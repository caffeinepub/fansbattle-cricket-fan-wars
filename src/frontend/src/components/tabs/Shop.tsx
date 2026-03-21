import { Button } from "@/components/ui/button";
import { DAILY_REWARD_AMOUNT } from "@/lib/firestore";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Props {
  onWatchAd?: () => void;
  addCoins: (n: number, type: string) => Promise<void>;
  spendCoins: (n: number, type: string) => Promise<boolean>;
  onViewHistory?: () => void;
}

const PACKAGES = [
  {
    id: 1,
    name: "Starter",
    coins: 10,
    price: 10,
    priceStr: "₹10",
    emoji: "🪙",
    highlight: false,
  },
  {
    id: 2,
    name: "Fan Pack",
    coins: 55,
    price: 50,
    priceStr: "₹50",
    emoji: "⚡",
    highlight: true,
  },
  {
    id: 3,
    name: "Pro Pack",
    coins: 120,
    price: 100,
    priceStr: "₹100",
    emoji: "🚀",
    highlight: false,
  },
];

const LAST_CLAIM_KEY = "fansbattle_last_claim";
const AD_COOLDOWN_SECONDS = 120;
const AD_DAILY_CAP = 3;

function getDateString() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function secondsUntilMidnight() {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

function calcCustomCoins(amount: number): number {
  if (amount >= 100) return Math.floor(amount * 1.2);
  if (amount >= 50) return Math.floor(amount * 1.1);
  return amount;
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

export default function Shop({
  addCoins,
  spendCoins: _spendCoins,
  onWatchAd,
  onViewHistory,
}: Props) {
  const [claimedToday, setClaimedToday] = useState(() => {
    return localStorage.getItem(LAST_CLAIM_KEY) === getDateString();
  });
  const [countdown, setCountdown] = useState(() => secondsUntilMidnight());
  const [customAmount, setCustomAmount] = useState("");
  const [adCooldown, setAdCooldown] = useState(() => getAdCooldownRemaining());
  const [adCountToday, setAdCountToday] = useState(() => getAdCountToday());

  const rzpScriptRef = useRef(false);

  // Load Razorpay script
  useEffect(() => {
    if (rzpScriptRef.current) return;
    rzpScriptRef.current = true;
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Re-check claim state when tab becomes visible
  useEffect(() => {
    const check = () => {
      setClaimedToday(localStorage.getItem(LAST_CLAIM_KEY) === getDateString());
      setCountdown(secondsUntilMidnight());
      setAdCooldown(getAdCooldownRemaining());
      setAdCountToday(getAdCountToday());
    };
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, []);

  // Countdown timer for claimed state
  useEffect(() => {
    if (!claimedToday) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [claimedToday]);

  // Ad cooldown ticker
  useEffect(() => {
    if (adCooldown <= 0) return;
    const timer = setInterval(() => {
      const remaining = getAdCooldownRemaining();
      setAdCooldown(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [adCooldown]);

  const handleClaim = async () => {
    if (claimedToday) {
      toast.info("Already claimed today! Come back tomorrow.");
      return;
    }
    const today = getDateString();
    if (localStorage.getItem(LAST_CLAIM_KEY) === today) {
      setClaimedToday(true);
      toast.info("Already claimed today! Come back tomorrow.");
      return;
    }
    await addCoins(DAILY_REWARD_AMOUNT, "daily_reward");
    localStorage.setItem(LAST_CLAIM_KEY, today);
    setClaimedToday(true);
    setCountdown(secondsUntilMidnight());
    toast.success(`🪙 +${DAILY_REWARD_AMOUNT} coins! Daily reward claimed!`, {
      duration: 3000,
    });
  };

  const handleBuy = (pkg: (typeof PACKAGES)[0]) => {
    const options = {
      key: "rzp_test_placeholder",
      amount: pkg.price * 100,
      currency: "INR",
      name: "FansBattle",
      description: `${pkg.coins} Coins Pack`,
      handler: async () => {
        await addCoins(pkg.coins, "coin_purchase");
        toast.success(`🎉 +${pkg.coins.toLocaleString()} coins added!`, {
          duration: 3000,
        });
      },
      theme: { color: "#f97316" },
      modal: {
        ondismiss: () => {
          toast.info("Payment cancelled.");
        },
      },
    };
    try {
      const rzp = new (
        window as unknown as {
          Razorpay: new (opts: unknown) => { open: () => void };
        }
      ).Razorpay(options);
      rzp.open();
    } catch {
      addCoins(pkg.coins, "coin_purchase");
      toast.success(
        `🎉 +${pkg.coins.toLocaleString()} coins added! (test mode)`,
        { duration: 3000 },
      );
    }
  };

  const handleBuyCustom = () => {
    const amount = Number.parseInt(customAmount);
    if (!amount || amount < 10) {
      toast.error("Minimum purchase is ₹10");
      return;
    }
    const coins = calcCustomCoins(amount);
    const options = {
      key: "rzp_test_placeholder",
      amount: amount * 100,
      currency: "INR",
      name: "FansBattle",
      description: `${coins} Custom Coins`,
      handler: async () => {
        await addCoins(coins, "coin_purchase");
        toast.success(`🎉 +${coins} coins added!`, { duration: 3000 });
      },
      theme: { color: "#f97316" },
      modal: { ondismiss: () => toast.info("Payment cancelled.") },
    };
    try {
      const rzp = new (
        window as unknown as {
          Razorpay: new (opts: unknown) => { open: () => void };
        }
      ).Razorpay(options);
      rzp.open();
    } catch {
      addCoins(coins, "coin_purchase");
      toast.success(`🎉 +${coins} coins added! (test mode)`, {
        duration: 3000,
      });
    }
  };

  const handleWatchAd = () => {
    if (adCountToday >= AD_DAILY_CAP) {
      toast.error("Daily ad limit reached. Come back tomorrow!");
      return;
    }
    if (adCooldown > 0) {
      toast.error(`Wait ${adCooldown}s before watching another ad.`);
      return;
    }
    if (onWatchAd) {
      onWatchAd();
    }
  };

  const customCoinsPreview = (() => {
    const amt = Number.parseInt(customAmount);
    if (!amt || amt < 10) return null;
    return calcCustomCoins(amt);
  })();

  const adDisabled = adCooldown > 0 || adCountToday >= AD_DAILY_CAP;

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛍️</span>
          <div>
            <h2 className="font-display text-xl font-800 text-foreground">
              Shop
            </h2>
            <p className="text-xs text-muted-foreground">Power up your game</p>
          </div>
        </div>
        {onViewHistory && (
          <button
            type="button"
            onClick={onViewHistory}
            data-ocid="shop.history.button"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
            style={{
              background: "oklch(0.22 0.05 250 / 0.6)",
              border: "1px solid oklch(0.35 0.08 250 / 0.5)",
              color: "oklch(0.72 0.1 250)",
            }}
          >
            📜 History
          </button>
        )}
      </div>

      {/* Daily Claim */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.2 0.08 80), oklch(0.15 0.05 80))",
          border: "1px solid oklch(0.6 0.15 80 / 0.4)",
        }}
      >
        <div className="absolute -top-4 -right-4 text-8xl opacity-20">🪙</div>
        <div className="relative z-10">
          <p
            className="font-display text-xs font-700 uppercase tracking-widest"
            style={{ color: "oklch(0.88 0.18 90)" }}
          >
            Daily Free
          </p>
          <h3 className="font-display text-2xl font-800 text-foreground mt-1">
            Claim {DAILY_REWARD_AMOUNT} Coins
          </h3>
          {claimedToday ? (
            <>
              <p
                className="text-sm mt-2 font-600"
                style={{ color: "oklch(0.75 0.1 80)" }}
              >
                Already Claimed Today ✓
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "oklch(0.6 0.08 80)" }}
              >
                Next claim in:
              </p>
              <p
                className="font-display text-xl font-800 mt-0.5"
                style={{ color: "oklch(0.88 0.18 90)" }}
              >
                {formatTime(countdown)}
              </p>
            </>
          ) : (
            <Button
              data-ocid="shop.daily_claim.button"
              onClick={handleClaim}
              className="mt-3 font-display font-700 text-lg px-6 h-11"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.88 0.18 90), oklch(0.78 0.2 70))",
                color: "oklch(0.12 0.02 240)",
              }}
            >
              🪙 Claim Free Coins
            </Button>
          )}
        </div>
      </motion.div>

      {/* Watch Ad */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4"
        style={{
          background: "oklch(0.65 0.18 220 / 0.08)",
          border: "1px solid oklch(0.65 0.18 220 / 0.35)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📺</span>
            <div>
              <p className="font-display text-sm font-700 text-foreground">
                Watch Ad
              </p>
              <p className="text-xs" style={{ color: "oklch(0.6 0.08 220)" }}>
                {adCountToday >= AD_DAILY_CAP
                  ? "Daily limit reached"
                  : adCooldown > 0
                    ? `Cooldown: ${adCooldown}s`
                    : `${AD_DAILY_CAP - adCountToday} watches left today`}
              </p>
            </div>
          </div>
          <span
            className="text-xs font-700 px-2 py-0.5 rounded-full"
            style={{
              background: adDisabled
                ? "oklch(0.3 0.04 220 / 0.3)"
                : "oklch(0.88 0.18 90 / 0.2)",
              color: adDisabled ? "oklch(0.5 0.05 220)" : "oklch(0.88 0.18 90)",
              border: adDisabled
                ? "1px solid oklch(0.4 0.05 220 / 0.3)"
                : "1px solid oklch(0.88 0.18 90 / 0.4)",
            }}
          >
            +2-5 🪙
          </span>
        </div>
        <motion.button
          data-ocid="shop.watch_ad.button"
          onClick={handleWatchAd}
          disabled={adDisabled}
          whileTap={adDisabled ? {} : { scale: 0.97 }}
          className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 font-display font-700 text-sm transition-colors"
          style={{
            background: adDisabled
              ? "oklch(0.2 0.04 220 / 0.5)"
              : "oklch(0.65 0.18 220 / 0.25)",
            border: adDisabled
              ? "1px solid oklch(0.3 0.05 220 / 0.3)"
              : "1px solid oklch(0.65 0.18 220 / 0.5)",
            color: adDisabled ? "oklch(0.45 0.05 220)" : "oklch(0.82 0.1 220)",
            cursor: adDisabled ? "not-allowed" : "pointer",
          }}
        >
          {adDisabled
            ? adCooldown > 0
              ? `⏳ Wait ${adCooldown}s`
              : "Daily limit reached"
            : "▶ Watch Ad for Coins"}
        </motion.button>
      </motion.div>

      {/* Coin Packages */}
      <h3 className="font-display text-sm font-700 text-muted-foreground uppercase tracking-wider">
        💰 Coin Packages
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {PACKAGES.map((pkg, idx) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{
              background: pkg.highlight
                ? "linear-gradient(135deg, oklch(0.25 0.08 255), oklch(0.2 0.05 255))"
                : "oklch(0.17 0.03 255)",
              border: `1px solid ${pkg.highlight ? "oklch(0.65 0.18 220 / 0.6)" : "oklch(0.25 0.04 255)"}`,
              boxShadow: pkg.highlight
                ? "0 0 20px oklch(0.65 0.18 220 / 0.2)"
                : "none",
            }}
          >
            {pkg.highlight && (
              <div className="absolute top-2 right-2">
                <span
                  className="text-[9px] font-700 px-1.5 py-0.5 rounded-full"
                  style={{ background: "oklch(0.65 0.18 220)", color: "white" }}
                >
                  BEST
                </span>
              </div>
            )}
            <div className="text-3xl mb-2">{pkg.emoji}</div>
            <h4 className="font-display text-sm font-700 text-foreground">
              {pkg.name}
            </h4>
            <p
              className="font-display text-base font-800 mt-1"
              style={{ color: "oklch(0.88 0.18 90)" }}
            >
              {pkg.coins} 🪙
            </p>
            <Button
              data-ocid={`shop.package.button.${idx + 1}`}
              onClick={() => handleBuy(pkg)}
              className="w-full h-8 text-xs font-700 mt-2"
              style={{
                background: pkg.highlight
                  ? "linear-gradient(135deg, oklch(0.65 0.18 220), oklch(0.7 0.2 230))"
                  : "oklch(0.22 0.04 255)",
                color: "oklch(0.9 0.02 240)",
                border: pkg.highlight
                  ? "none"
                  : "1px solid oklch(0.3 0.04 255)",
              }}
            >
              {pkg.priceStr}
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Custom Amount */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 space-y-3"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.18 0.05 50), oklch(0.14 0.03 50))",
          border: "1px solid oklch(0.55 0.15 50 / 0.4)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">✏️</span>
          <div>
            <h3 className="font-display text-base font-700 text-foreground">
              Custom Amount
            </h3>
            <p className="text-xs" style={{ color: "oklch(0.65 0.1 50)" }}>
              ₹1 = 1 coin (bonus for larger amounts)
            </p>
          </div>
        </div>
        <div className="relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold"
            style={{ color: "oklch(0.75 0.15 80)" }}
          >
            ₹
          </span>
          <input
            data-ocid="shop.custom_amount.input"
            type="number"
            min={10}
            placeholder="Enter amount (min ₹10)"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm font-600 outline-none"
            style={{
              background: "oklch(0.2 0.05 50 / 0.6)",
              border: "1px solid oklch(0.5 0.12 50 / 0.4)",
              color: "oklch(0.9 0.04 80)",
            }}
          />
        </div>
        {customCoinsPreview !== null && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-700 text-center"
            style={{ color: "oklch(0.85 0.18 90)" }}
          >
            You'll receive: {customCoinsPreview} 🪙
          </motion.p>
        )}
        <Button
          data-ocid="shop.custom_amount.submit_button"
          onClick={handleBuyCustom}
          disabled={!customAmount || Number.parseInt(customAmount) < 10}
          className="w-full font-display font-700 h-11"
          style={{
            background:
              !customAmount || Number.parseInt(customAmount) < 10
                ? "oklch(0.25 0.04 50)"
                : "linear-gradient(135deg, oklch(0.75 0.2 55), oklch(0.68 0.22 40))",
            color:
              !customAmount || Number.parseInt(customAmount) < 10
                ? "oklch(0.5 0.06 50)"
                : "oklch(0.12 0.02 50)",
          }}
        >
          Buy Custom Pack
        </Button>
      </motion.div>

      {/* Legal Disclaimer */}
      <p className="text-center text-xs text-muted-foreground/60 mt-2 px-2">
        ⚠️ This app is for entertainment purposes only and is not affiliated with
        IPL or BCCI.
      </p>

      <div className="pt-2 pb-2 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
