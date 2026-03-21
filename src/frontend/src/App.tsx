import AdminPanel from "@/components/AdminPanel";
import BannerAd from "@/components/BannerAd";
import BottomNav from "@/components/BottomNav";
import DailyRewardModal from "@/components/DailyRewardModal";
import Header from "@/components/Header";
import InterstitialAd from "@/components/InterstitialAd";
import LoginScreen from "@/components/LoginScreen";
import RewardedAdModal from "@/components/RewardedAdModal";
import SplashScreen from "@/components/SplashScreen";
import TransactionHistory from "@/components/TransactionHistory";
import FriendsRoom from "@/components/tabs/FriendsRoom";
import LiveMatch from "@/components/tabs/LiveMatch";
import Shop from "@/components/tabs/Shop";
import StickerCreator from "@/components/tabs/StickerCreator";
import VoteBattle from "@/components/tabs/VoteBattle";
import { Toaster } from "@/components/ui/sonner";
import { UserContextProvider, useUser } from "@/context/UserContext";
import { DAILY_REWARD_AMOUNT, claimDailyReward } from "@/lib/firestore";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type TabId = "live" | "vote" | "sticker" | "friends" | "shop" | "admin";

type AppState = "splash" | "loading" | "login" | "main";

const AD_COOLDOWN_SECONDS = 120; // 2 minutes
const AD_DAILY_CAP = 3;

function getDateString(date: Date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function AppInner() {
  const {
    userId,
    userData,
    loading,
    addCoins,
    spendCoins,
    isAdmin,
    refreshUserData,
  } = useUser();
  const [appState, setAppState] = useState<AppState>("splash");
  const [activeTab, setActiveTab] = useState<TabId>("live");
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [showRewardedAd, setShowRewardedAd] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [adRewardCollected, setAdRewardCollected] = useState(false);
  const [dismissedLowBalance, setDismissedLowBalance] = useState(false);

  const coins = userData?.coins ?? 0;

  const handleSplashComplete = () => {
    if (loading) {
      setAppState("loading");
    } else {
      setAppState(userId ? "main" : "login");
    }
  };

  useEffect(() => {
    if (appState === "loading" && !loading) {
      setAppState(userId ? "main" : "login");
    }
  }, [appState, loading, userId]);

  useEffect(() => {
    if (userId && (appState === "login" || appState === "loading")) {
      setAppState("main");
    }
  }, [userId, appState]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - only triggers on appState transition
  useEffect(() => {
    if (appState === "main" && userData) {
      const today = getDateString();
      if (userData.lastClaimDate !== today) {
        setTimeout(() => setShowDailyReward(true), 800);
      }
    }
  }, [appState]);

  // Reset low balance dismissal when coins increase above threshold
  useEffect(() => {
    if (coins >= 10) {
      setDismissedLowBalance(false);
    }
  }, [coins]);

  const today = getDateString();
  const alreadyClaimed = userData?.lastClaimDate === today;

  const handleClaimDailyReward = async () => {
    if (!userId) {
      toast.error("Please start the app first");
      return;
    }

    const result = await claimDailyReward(userId);

    if (result.alreadyClaimed) {
      toast.info("Already claimed today! Come back tomorrow. 📅");
      setShowDailyReward(false);
      return;
    }

    if (result.success) {
      toast.success(`🪙 +${DAILY_REWARD_AMOUNT} coins! Daily reward claimed!`, {
        duration: 3000,
      });
      setShowDailyReward(false);
      refreshUserData();
    } else {
      toast.error("Failed to claim reward. Try again.");
    }
  };

  const handleAdReward = async () => {
    if (adRewardCollected) return;

    const now = Date.now();
    const lastAdTime = Number.parseInt(
      localStorage.getItem("fansbattle_last_ad_time") || "0",
    );
    const adDate = localStorage.getItem("fansbattle_ad_date");
    const todayStr = getDateString();
    let adCount =
      adDate === todayStr
        ? Number.parseInt(
            localStorage.getItem("fansbattle_ad_count_today") || "0",
          )
        : 0;

    if (now - lastAdTime < AD_COOLDOWN_SECONDS * 1000) {
      const remaining = Math.ceil(
        (AD_COOLDOWN_SECONDS * 1000 - (now - lastAdTime)) / 1000,
      );
      toast.error(`Wait ${remaining}s before watching another ad.`);
      setShowRewardedAd(false);
      return;
    }
    if (adCount >= AD_DAILY_CAP) {
      toast.error("Daily ad limit reached. Come back tomorrow!");
      setShowRewardedAd(false);
      return;
    }

    setAdRewardCollected(true);
    const reward = Math.floor(Math.random() * 4) + 2; // 2-5 coins
    await addCoins(reward, "ad_reward");

    localStorage.setItem("fansbattle_last_ad_time", String(now));
    localStorage.setItem("fansbattle_ad_date", todayStr);
    localStorage.setItem("fansbattle_ad_count_today", String(adCount + 1));

    toast.success(`+${reward} coins from ad! 🪙`, { duration: 2500 });
    setShowRewardedAd(false);
    setTimeout(() => setAdRewardCollected(false), 2000);
  };

  if (appState === "splash") {
    return (
      <>
        <SplashScreen onComplete={handleSplashComplete} />
        <Toaster position="top-center" />
      </>
    );
  }

  if (appState === "loading") {
    return (
      <div
        data-ocid="app.loading_state"
        className="app-shell flex flex-col items-center justify-center min-h-dvh stadium-gradient"
      >
        <div className="text-5xl mb-4 animate-bounce">🏏</div>
        <p className="text-muted-foreground text-sm tracking-widest uppercase">
          Loading...
        </p>
        <Toaster position="top-center" />
      </div>
    );
  }

  if (appState === "login" || !userId) {
    return (
      <>
        <LoginScreen />
        <Toaster position="top-center" />
      </>
    );
  }

  return (
    <div className="app-shell stadium-gradient flex flex-col">
      <Header />

      <main
        className="flex-1 scrollable-content pb-32"
        style={{ paddingTop: "64px" }}
      >
        {/* Low balance banner */}
        {coins < 10 && !dismissedLowBalance && (
          <div
            data-ocid="app.low_balance.panel"
            className="mx-4 mt-3 mb-1 px-4 py-3 rounded-2xl flex items-center justify-between gap-3"
            style={{
              background: "oklch(0.22 0.08 15 / 0.8)",
              border: "1px solid oklch(0.55 0.22 15 / 0.5)",
            }}
          >
            <p className="text-sm font-semibold text-foreground">
              ⚠️ Low balance! Buy coins to keep playing.
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                data-ocid="app.low_balance.buy_button"
                onClick={() => setActiveTab("shop")}
                className="text-xs px-3 py-1 rounded-full font-bold"
                style={{
                  background: "oklch(0.72 0.22 50)",
                  color: "oklch(0.12 0.02 50)",
                }}
              >
                Buy
              </button>
              <button
                type="button"
                data-ocid="app.low_balance.close_button"
                onClick={() => setDismissedLowBalance(true)}
                className="text-xs text-muted-foreground"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {activeTab === "live" && (
          <LiveMatch
            addCoins={addCoins}
            spendCoins={spendCoins}
            onGameEnd={() => setShowInterstitial(true)}
          />
        )}
        {activeTab === "vote" && (
          <VoteBattle addCoins={addCoins} spendCoins={spendCoins} />
        )}
        {activeTab === "sticker" && (
          <StickerCreator addCoins={addCoins} spendCoins={spendCoins} />
        )}
        {activeTab === "friends" && (
          <FriendsRoom
            spendCoins={spendCoins}
            addCoins={addCoins}
            username={userData?.username || "Fan"}
            onGameEnd={() => setShowInterstitial(true)}
          />
        )}
        {activeTab === "shop" && (
          <Shop
            addCoins={addCoins}
            spendCoins={spendCoins}
            onWatchAd={() => {
              setAdRewardCollected(false);
              setShowRewardedAd(true);
            }}
            onViewHistory={() => setShowTransactionHistory(true)}
          />
        )}
        {activeTab === "admin" && isAdmin && <AdminPanel />}
      </main>

      <BannerAd />
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showAdmin={isAdmin}
      />
      <Toaster position="top-center" richColors />

      {showDailyReward && (
        <DailyRewardModal
          streakDay={1}
          coinsToEarn={DAILY_REWARD_AMOUNT}
          onClaim={handleClaimDailyReward}
          alreadyClaimed={alreadyClaimed}
          onClose={() => setShowDailyReward(false)}
        />
      )}

      <InterstitialAd
        isOpen={showInterstitial}
        onClose={() => setShowInterstitial(false)}
      />

      <RewardedAdModal
        isOpen={showRewardedAd}
        onClose={() => setShowRewardedAd(false)}
        onReward={handleAdReward}
      />

      <TransactionHistory
        userId={userId}
        isOpen={showTransactionHistory}
        onClose={() => setShowTransactionHistory(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <UserContextProvider>
      <AppInner />
    </UserContextProvider>
  );
}
