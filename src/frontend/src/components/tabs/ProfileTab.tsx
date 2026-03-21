import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  onOpenShop: () => void;
}

export default function ProfileTab({ onOpenShop }: Props) {
  const { userData, coins, deviceId, logout, claimReward } = useUser();
  const [claiming, setClaiming] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const alreadyClaimed = userData?.lastClaimDate === today;

  const initials = userData?.username
    ? userData.username.slice(0, 2).toUpperCase()
    : "?";

  const truncatedId = deviceId
    ? `${deviceId.slice(0, 8)}...${deviceId.slice(-4)}`
    : "—";

  const handleClaim = async () => {
    if (alreadyClaimed) {
      toast.info("Already claimed today! Come back tomorrow.");
      return;
    }
    setClaiming(true);
    const result = await claimReward();
    setClaiming(false);
    if (result.success) {
      toast.success("🪙 +5 coins! Daily reward claimed!", { duration: 3000 });
    } else if (result.alreadyClaimed) {
      toast.info("Already claimed today! Come back tomorrow.");
    } else {
      toast.error(result.error ?? "Failed to claim reward. Try again.");
    }
  };

  return (
    <div className="px-4 py-6 space-y-4">
      {/* Avatar + Info */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-6 flex flex-col items-center gap-3"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.2 0.06 255), oklch(0.15 0.04 255))",
          border: "1px solid oklch(0.3 0.06 255 / 0.5)",
        }}
      >
        {/* Avatar circle */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center font-display font-800 text-2xl"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.65 0.18 220), oklch(0.72 0.2 230))",
            color: "white",
            boxShadow: "0 0 24px oklch(0.65 0.18 220 / 0.4)",
          }}
        >
          {initials}
        </div>

        {/* Username */}
        <div className="text-center">
          <h2 className="font-display font-800 text-foreground text-xl">
            {userData?.username ?? "Loading..."}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Cricket Fan</p>
        </div>

        {/* Coins */}
        <div
          className="flex items-center gap-2 px-5 py-2 rounded-full"
          style={{
            background: "oklch(0.22 0.05 80 / 0.3)",
            border: "1px solid oklch(0.72 0.18 80 / 0.3)",
          }}
        >
          <span className="text-xl">🪙</span>
          <span
            className="font-display font-800 text-lg"
            style={{ color: "oklch(0.88 0.18 80)" }}
          >
            {coins.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">coins</span>
        </div>

        {/* Device ID */}
        <p className="text-[10px] text-muted-foreground/60 font-mono">
          ID: {truncatedId}
        </p>
      </motion.div>

      {/* Daily Reward */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-5"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.2 0.08 80), oklch(0.15 0.05 80))",
          border: "1px solid oklch(0.6 0.15 80 / 0.4)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-700 text-foreground text-base">
              🎁 Daily Reward
            </h3>
            <p
              className="text-xs mt-0.5"
              style={{ color: "oklch(0.7 0.1 80)" }}
            >
              {alreadyClaimed ? "Come back tomorrow!" : "+5 coins available"}
            </p>
          </div>
          <Button
            data-ocid="profile.daily_claim.button"
            onClick={handleClaim}
            disabled={alreadyClaimed || claiming}
            className="font-display font-700 h-10 px-4"
            style={{
              background: alreadyClaimed
                ? "oklch(0.25 0.04 255)"
                : "linear-gradient(135deg, oklch(0.85 0.18 80), oklch(0.75 0.2 60))",
              color: alreadyClaimed
                ? "oklch(0.5 0.05 255)"
                : "oklch(0.12 0.02 50)",
            }}
          >
            {claiming ? "Claiming..." : alreadyClaimed ? "✓ Claimed" : "Claim"}
          </Button>
        </div>
      </motion.div>

      {/* Shop */}
      <motion.button
        type="button"
        data-ocid="profile.shop.button"
        onClick={onOpenShop}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="w-full rounded-2xl p-4 flex items-center gap-4 text-left transition-all"
        style={{
          background: "oklch(0.17 0.03 255)",
          border: "1px solid oklch(0.65 0.18 220 / 0.3)",
        }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: "oklch(0.65 0.18 220 / 0.15)" }}
        >
          🛍️
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-700 text-foreground text-sm">Shop</p>
          <p className="text-xs text-muted-foreground">
            Buy coins, watch ads, earn rewards
          </p>
        </div>
        <span className="text-muted-foreground text-sm">→</span>
      </motion.button>

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="pt-2"
      >
        <Button
          data-ocid="profile.logout.button"
          onClick={logout}
          variant="outline"
          className="w-full h-12 font-display font-700 text-sm"
          style={{
            background: "oklch(0.62 0.22 15 / 0.08)",
            border: "1px solid oklch(0.62 0.22 15 / 0.4)",
            color: "oklch(0.72 0.18 15)",
          }}
        >
          Sign Out
        </Button>
      </motion.div>

      {/* Legal + Footer */}
      <div className="pt-2 pb-4 text-center space-y-2">
        <p className="text-xs text-muted-foreground/50 px-4">
          For entertainment only. Not affiliated with IPL or BCCI.
        </p>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
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
