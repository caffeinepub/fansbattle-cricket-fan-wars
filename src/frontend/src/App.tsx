import AdminPanel from "@/components/AdminPanel";
import BannerAd from "@/components/BannerAd";
import BottomNav from "@/components/BottomNav";
import DailyRewardModal from "@/components/DailyRewardModal";
import Header from "@/components/Header";
import InterstitialAd from "@/components/InterstitialAd";
import LoginScreen from "@/components/LoginScreen";
import RewardedAdModal from "@/components/RewardedAdModal";
import SplashScreen from "@/components/SplashScreen";
import FriendsRoom from "@/components/tabs/FriendsRoom";
import LiveMatch from "@/components/tabs/LiveMatch";
import Shop from "@/components/tabs/Shop";
import StickerCreator from "@/components/tabs/StickerCreator";
import VoteBattle from "@/components/tabs/VoteBattle";
import { Toaster } from "@/components/ui/sonner";
import { UserContextProvider, useUser } from "@/context/UserContext";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type TabId = "live" | "vote" | "sticker" | "friends" | "shop" | "admin";

type AppState = "splash" | "loading" | "login" | "main";

const STREAK_REWARDS: Record<number, number> = {
  1: 20,
  2: 30,
  3: 50,
  4: 70,
  5: 100,
};

const LAST_CLAIM_KEY = "fansbattle_last_claim";
const STREAK_DAY_KEY = "fansbattle_streak_day";

function getDateString(date: Date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function computeStreak(): { streakDay: number; shouldShow: boolean } {
  const today = getDateString();
  const lastClaim = localStorage.getItem(LAST_CLAIM_KEY);
  const prevDay = Number.parseInt(
    localStorage.getItem(STREAK_DAY_KEY) || "0",
    10,
  );
  if (!lastClaim) return { streakDay: 1, shouldShow: true };
  if (lastClaim === today) return { streakDay: prevDay, shouldShow: false };
  const lastDate = new Date(lastClaim);
  const todayDate = new Date(today);
  const diffDays = Math.round(
    (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 1) {
    return { streakDay: (prevDay % 5) + 1, shouldShow: true };
  }
  return { streakDay: 1, shouldShow: true };
}

function AppInner() {
  const { userId, userData, loading, addCoins, spendCoins, isAdmin } =
    useUser();
  const [appState, setAppState] = useState<AppState>("splash");
  const [activeTab, setActiveTab] = useState<TabId>("live");
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [streakDay, setStreakDay] = useState(1);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [showRewardedAd, setShowRewardedAd] = useState(false);

  // After splash completes, move to loading/main/login depending on state
  const handleSplashComplete = () => {
    if (loading) {
      // Still fetching user — show a brief loading state instead of blocking
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

  // Daily reward on entering main
  useEffect(() => {
    if (appState === "main") {
      const { streakDay: day, shouldShow } = computeStreak();
      if (shouldShow) {
        setStreakDay(day);
        setTimeout(() => setShowDailyReward(true), 800);
      }
    }
  }, [appState]);

  const handleClaimDailyReward = async () => {
    const coins = STREAK_REWARDS[streakDay] ?? 20;
    await addCoins(coins, "daily_reward");
    localStorage.setItem(LAST_CLAIM_KEY, getDateString());
    localStorage.setItem(STREAK_DAY_KEY, String(streakDay));
    setShowDailyReward(false);
    toast.success(`🔥 Day ${streakDay} reward claimed! +${coins} coins`, {
      duration: 4000,
    });
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
            onWatchAd={() => setShowRewardedAd(true)}
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
          streakDay={streakDay}
          coinsToEarn={STREAK_REWARDS[streakDay] ?? 20}
          onClaim={handleClaimDailyReward}
        />
      )}

      <InterstitialAd
        isOpen={showInterstitial}
        onClose={() => setShowInterstitial(false)}
      />

      <RewardedAdModal
        isOpen={showRewardedAd}
        onClose={() => setShowRewardedAd(false)}
        onReward={async () => {
          await addCoins(20, "ad_reward");
          setShowRewardedAd(false);
        }}
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
