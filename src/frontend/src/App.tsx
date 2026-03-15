import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import LoginScreen from "@/components/LoginScreen";
import ProfileSetup from "@/components/ProfileSetup";
import FriendsRoom from "@/components/tabs/FriendsRoom";
import LiveMatch from "@/components/tabs/LiveMatch";
import Shop from "@/components/tabs/Shop";
import StickerCreator from "@/components/tabs/StickerCreator";
import VoteBattle from "@/components/tabs/VoteBattle";
import { Toaster } from "@/components/ui/sonner";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type TabId = "live" | "vote" | "sticker" | "friends" | "shop";

type AppState = "login" | "profileSetup" | "main";

interface UserProfile {
  username: string;
  avatar: string;
  favoriteTeam: string;
  coins: number;
  phone: string;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>("login");
  const [activeTab, setActiveTab] = useState<TabId>("live");
  const [userProfile, setUserProfile] = useState<UserProfile>({
    username: "",
    avatar: "",
    favoriteTeam: "",
    coins: 100,
    phone: "",
  });
  const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);
  const dailyRewardRef = useRef(false);

  useEffect(() => {
    if (appState === "main" && !dailyRewardRef.current) {
      dailyRewardRef.current = true;
      if (!dailyRewardClaimed) {
        setDailyRewardClaimed(true);
        setUserProfile((prev) => ({ ...prev, coins: prev.coins + 25 }));
        setTimeout(() => {
          toast.success("🌅 Daily Login Reward: +25 coins! Streak: 1 day", {
            duration: 4000,
          });
        }, 800);
      }
    }
  }, [appState, dailyRewardClaimed]);

  const addCoins = (amount: number) =>
    setUserProfile((prev) => ({ ...prev, coins: prev.coins + amount }));

  const spendCoins = (amount: number): boolean => {
    let success = false;
    setUserProfile((prev) => {
      if (prev.coins >= amount) {
        success = true;
        return { ...prev, coins: prev.coins - amount };
      }
      return prev;
    });
    if (!success) {
      toast.error("Not enough coins! 🪙", { duration: 2500 });
    }
    return success;
  };

  const handleLogin = (phone: string) => {
    setUserProfile((prev) => ({ ...prev, phone }));
    setAppState("profileSetup");
  };

  const handleProfileComplete = (
    username: string,
    avatar: string,
    favoriteTeam: string,
  ) => {
    setUserProfile((prev) => ({ ...prev, username, avatar, favoriteTeam }));
    setAppState("main");
  };

  const handleLogout = () => {
    setUserProfile({
      username: "",
      avatar: "",
      favoriteTeam: "",
      coins: 100,
      phone: "",
    });
    setDailyRewardClaimed(false);
    dailyRewardRef.current = false;
    setAppState("login");
  };

  if (appState === "login") {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        <Toaster position="top-center" />
      </>
    );
  }

  if (appState === "profileSetup") {
    return (
      <>
        <ProfileSetup onComplete={handleProfileComplete} />
        <Toaster position="top-center" />
      </>
    );
  }

  return (
    <div className="app-shell stadium-gradient flex flex-col">
      <Header
        coins={userProfile.coins}
        onLogout={handleLogout}
        username={userProfile.username}
        avatar={userProfile.avatar}
      />

      <main
        className="flex-1 scrollable-content pb-20"
        style={{ paddingTop: "64px" }}
      >
        {activeTab === "live" && (
          <LiveMatch addCoins={addCoins} spendCoins={spendCoins} />
        )}
        {activeTab === "vote" && <VoteBattle addCoins={addCoins} />}
        {activeTab === "sticker" && (
          <StickerCreator addCoins={addCoins} spendCoins={spendCoins} />
        )}
        {activeTab === "friends" && <FriendsRoom spendCoins={spendCoins} />}
        {activeTab === "shop" && (
          <Shop addCoins={addCoins} spendCoins={spendCoins} />
        )}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      <Toaster position="top-center" richColors />
    </div>
  );
}
