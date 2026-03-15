import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Props {
  addCoins: (n: number) => void;
  spendCoins: (n: number) => boolean;
}

const PACKAGES = [
  {
    id: 1,
    name: "Starter",
    coins: 200,
    price: "₹19",
    emoji: "🪙",
    highlight: false,
  },
  {
    id: 2,
    name: "Fan Pack",
    coins: 700,
    price: "₹49",
    emoji: "⚡",
    highlight: true,
  },
  {
    id: 3,
    name: "Pro Pack",
    coins: 1500,
    price: "₹99",
    emoji: "🚀",
    highlight: false,
  },
];

const SPIN_RESULTS = [10, 15, 20, 25, 30, 50, 75, 100, 150, 200];
const SPIN_COST = 20;

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

export default function Shop({ addCoins, spendCoins }: Props) {
  const [claimed, setClaimed] = useState(false);
  const [countdown, setCountdown] = useState(83645);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [inviteCode] = useState(() => generateInviteCode());
  const spinRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!claimed) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [claimed]);

  const handleClaim = () => {
    if (claimed) return;
    setClaimed(true);
    addCoins(50);
    toast.success("🪙 +50 coins claimed! Come back tomorrow.", {
      duration: 3000,
    });
  };

  const handleBuy = (pkg: (typeof PACKAGES)[0]) => {
    addCoins(pkg.coins);
    toast.success(
      `🎉 +${pkg.coins.toLocaleString()} coins added! Purchase simulated!`,
      { duration: 3000 },
    );
  };

  const handleWatchAd = () => {
    addCoins(25);
    toast.success("📺 Ad watched! +25 coins earned.", { duration: 2500 });
  };

  const handleSpin = () => {
    if (isSpinning) return;
    if (!spendCoins(SPIN_COST)) return;
    setIsSpinning(true);
    setLastResult(null);
    setTimeout(() => {
      const result =
        SPIN_RESULTS[Math.floor(Math.random() * SPIN_RESULTS.length)];
      setLastResult(result);
      setIsSpinning(false);
      addCoins(result);
      toast.success(`+${result} coins! Lucky spin! 🎰`, { duration: 3000 });
    }, 1500);
  };

  const handleCopyInvite = () => {
    void navigator.clipboard.writeText(
      `Join FansBattle with my code: ${inviteCode}`,
    );
    toast.success("📋 Invite link copied!", { duration: 2000 });
  };

  const handleClaimInviteReward = () => {
    addCoins(50);
    toast.success("👥 Friend invited! +50 coins!", { duration: 2500 });
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">🛍️</span>
        <div>
          <h2 className="font-display text-xl font-800 text-foreground">
            Shop
          </h2>
          <p className="text-xs text-muted-foreground">Power up your game</p>
        </div>
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
            Claim 50 Coins
          </h3>
          {claimed ? (
            <>
              <p
                className="text-sm mt-2"
                style={{ color: "oklch(0.75 0.1 80)" }}
              >
                Next claim in:
              </p>
              <p
                className="font-display text-xl font-800 mt-1"
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
      <motion.button
        data-ocid="shop.watch_ad.button"
        onClick={handleWatchAd}
        whileTap={{ scale: 0.97 }}
        className="w-full py-3 rounded-2xl flex items-center justify-center gap-3 font-display font-700 text-foreground transition-colors"
        style={{
          background: "oklch(0.65 0.18 220 / 0.15)",
          border: "1px solid oklch(0.65 0.18 220 / 0.4)",
        }}
      >
        <span className="text-2xl">📺</span>
        <span>Watch Ad</span>
        <span
          className="text-xs font-700 px-2 py-0.5 rounded-full ml-1"
          style={{
            background: "oklch(0.88 0.18 90 / 0.2)",
            color: "oklch(0.88 0.18 90)",
            border: "1px solid oklch(0.88 0.18 90 / 0.4)",
          }}
        >
          +25 🪙
        </span>
      </motion.button>

      {/* Spin Wheel */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 space-y-3"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.18 0.08 290), oklch(0.14 0.05 290))",
          border: "1px solid oklch(0.55 0.18 290 / 0.4)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🎡</span>
          <div>
            <h3 className="font-display text-base font-700 text-foreground">
              Spin Wheel
            </h3>
            <p className="text-xs" style={{ color: "oklch(0.65 0.12 290)" }}>
              Win up to 200 🪙!
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div
            ref={spinRef}
            className="text-7xl select-none"
            style={{
              display: "inline-block",
              animation: isSpinning
                ? "spin-wheel 0.3s linear infinite"
                : "none",
              filter: isSpinning
                ? "drop-shadow(0 0 12px oklch(0.7 0.2 290))"
                : "none",
              transition: "filter 0.3s",
            }}
          >
            🎡
          </div>

          {lastResult !== null && !isSpinning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <span
                className="font-display text-2xl font-800"
                style={{ color: "oklch(0.88 0.18 90)" }}
              >
                +{lastResult} 🪙
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Lucky spin!
              </p>
            </motion.div>
          )}

          <Button
            data-ocid="shop.spin_wheel.button"
            onClick={handleSpin}
            disabled={isSpinning}
            className="w-full font-display font-700 h-11"
            style={{
              background: isSpinning
                ? "oklch(0.35 0.08 290)"
                : "linear-gradient(135deg, oklch(0.6 0.2 290), oklch(0.65 0.22 300))",
              color: "white",
              opacity: isSpinning ? 0.7 : 1,
            }}
          >
            {isSpinning ? "Spinning..." : `Spin Wheel — ${SPIN_COST} 🪙`}
          </Button>
        </div>
      </motion.div>

      {/* Invite Friends */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 space-y-3"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.18 0.06 140), oklch(0.14 0.04 140))",
          border: "1px solid oklch(0.55 0.15 140 / 0.4)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">👥</span>
          <div>
            <h3 className="font-display text-base font-700 text-foreground">
              Invite Friends
            </h3>
            <p className="text-xs" style={{ color: "oklch(0.65 0.12 140)" }}>
              Earn +50 🪙 per invite!
            </p>
          </div>
        </div>

        <div
          className="flex items-center justify-between px-3 py-2 rounded-xl"
          style={{
            background: "oklch(0.22 0.06 140 / 0.5)",
            border: "1px solid oklch(0.5 0.12 140 / 0.3)",
          }}
        >
          <span
            className="font-display text-lg font-800 tracking-widest"
            style={{ color: "oklch(0.85 0.15 140)" }}
          >
            {inviteCode}
          </span>
          <span className="text-xs text-muted-foreground">Your Code</span>
        </div>

        <Button
          data-ocid="shop.invite.button"
          onClick={handleCopyInvite}
          className="w-full font-700 h-10"
          style={{
            background: "oklch(0.55 0.18 140 / 0.3)",
            border: "1px solid oklch(0.55 0.18 140 / 0.5)",
            color: "oklch(0.85 0.15 140)",
          }}
        >
          📤 Copy Invite Link
        </Button>

        <Button
          data-ocid="shop.invite_reward.button"
          onClick={handleClaimInviteReward}
          className="w-full font-display font-700 h-10"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.55 0.18 140), oklch(0.6 0.2 150))",
            color: "white",
          }}
        >
          👥 Claim Invite Reward (+50 🪙)
        </Button>
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
              border: `1px solid ${
                pkg.highlight
                  ? "oklch(0.65 0.18 220 / 0.6)"
                  : "oklch(0.25 0.04 255)"
              }`,
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
                  BEST VALUE
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
              {pkg.coins.toLocaleString()} 🪙
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
              {pkg.price}
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-4 pb-2 text-center">
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
