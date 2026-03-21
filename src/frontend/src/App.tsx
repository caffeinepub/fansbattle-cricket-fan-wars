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
import { claimDailyReward } from "@/lib/firestore";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type TabId = "live" | "vote" | "sticker" | "friends" | "shop" | "admin";

type AppState = "splash" | "loading" | "login" | "main";

// Daily reward is always 20 coins — matches Firestore logic
const DAILY_REWARD_COINS = 20;

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
  // Track if ad reward has been collected (prevent double-click)
  const [adRewardCollected, setAdRewardCollected] = useState(false);

  // After splash completes, move to loading/main/login depending on state
  const handleSplashComplete = () => {
    if (loading) {
      setAppState("loading");
    } else {
      setAppState(userId ? "main" : "login");
    }
  };

  // When loading finishes (after splash), transition out of loading state
  useEffect(() => {
    if (appState === "loading" && !loading) {
      setAppState(userId ? "main" : "login");
    }
  }, [appState, loading, userId]);

  // When userId becomes set (e.g. after startPlaying on login screen), go to main
  useEffect(() => {
    if (userId && (appState === "login" || appState === "loading")) {
      setAppState("main");
    }
  }, [userId, appState]);

  // Show daily reward modal once per day when entering main
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - only triggers on appState transition
  useEffect(() => {
    if (appState === "main" && userData) {
      const today = getDateString();
      // Only show if not already claimed today (check Firestore data)
      if (userData.lastClaimDate !== today) {
        setTimeout(() => setShowDailyReward(true), 800);
      }
    }
  }, [appState]);

  // alreadyClaimed: source of truth is Firestore userData
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
      toast.success(`🪙 +${DAILY_REWARD_COINS} coins! Daily reward claimed!`, {
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
    setAdRewardCollected(true);
    await addCoins(20, "ad_reward");
    setShowRewardedAd(false);
    // Reset for next ad viewing session
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

  // Brief loading screen after splash while Firestore resolves
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
        {activeTab === "live" && (
          <LiveMatch
            addCoins={addCoins}
            spendCoins={spendCoins}
            onGameEnd={() => setShowInterstitial(true)}
          />
        )}
        {activeTab === "vote" && <VoteBattle addCoins={addCoins} />}
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
          coinsToEarn={DAILY_REWARD_COINS}
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
