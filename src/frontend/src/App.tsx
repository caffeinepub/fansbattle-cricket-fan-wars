import AdminPanel from "@/components/AdminPanel";
import BottomNav from "@/components/BottomNav";
import ContestListScreen from "@/components/ContestListScreen";
import ContestQuestionScreen from "@/components/ContestQuestionScreen";
import Header from "@/components/Header";
import LoginScreen from "@/components/LoginScreen";
import ShopPage from "@/components/ShopPage";
import SplashScreen from "@/components/SplashScreen";
import HomeTab from "@/components/tabs/HomeTab";
import type { ApiMatch } from "@/components/tabs/HomeTab";
import ProfileTab from "@/components/tabs/ProfileTab";
import { Toaster } from "@/components/ui/sonner";
import { UserContextProvider, useUser } from "@/context/UserContext";
import type { Contest } from "@/lib/firestore";
import { useEffect, useState } from "react";

export type TabId = "home" | "profile" | "admin";
type Screen = "main" | "shop" | "contestList" | "contestQuestions";
type AppState = "splash" | "loading" | "login" | "main";

function AppInner() {
  const { deviceId, loading, isAdmin } = useUser();
  const [appState, setAppState] = useState<AppState>("splash");
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [screen, setScreen] = useState<Screen>("main");
  const [selectedMatch, setSelectedMatch] = useState<ApiMatch | null>(null);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);

  const handleSplashComplete = () => {
    if (loading) {
      setAppState("loading");
    } else {
      setAppState(deviceId ? "main" : "login");
    }
  };

  useEffect(() => {
    if (appState === "loading" && !loading) {
      setAppState(deviceId ? "main" : "login");
    }
  }, [appState, loading, deviceId]);

  useEffect(() => {
    if (deviceId && (appState === "login" || appState === "loading")) {
      setAppState("main");
    }
  }, [deviceId, appState]);

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

  if (appState === "login" || !deviceId) {
    return (
      <>
        <LoginScreen />
        <Toaster position="top-center" />
      </>
    );
  }

  // Full-screen shop page
  if (screen === "shop") {
    return (
      <>
        <ShopPage onBack={() => setScreen("main")} />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  // Contest list for a match
  if (screen === "contestList" && selectedMatch) {
    return (
      <>
        <ContestListScreen
          match={selectedMatch}
          onBack={() => setScreen("main")}
          onJoinContest={(contest) => {
            setSelectedContest(contest);
            setScreen("contestQuestions");
          }}
        />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  // Contest question screen
  if (screen === "contestQuestions" && selectedMatch && selectedContest) {
    return (
      <>
        <ContestQuestionScreen
          match={selectedMatch}
          contest={selectedContest}
          onBack={() => setScreen("contestList")}
        />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  // Main screen
  return (
    <div className="app-shell stadium-gradient flex flex-col">
      <Header onCoinClick={() => setScreen("shop")} />

      <main
        className="flex-1 overflow-y-auto pb-20"
        style={{ paddingTop: "64px" }}
      >
        {activeTab === "home" && (
          <HomeTab
            onMatchSelect={(match) => {
              setSelectedMatch(match);
              setScreen("contestList");
            }}
          />
        )}
        {activeTab === "profile" && (
          <ProfileTab onOpenShop={() => setScreen("shop")} />
        )}
        {activeTab === "admin" && isAdmin && <AdminPanel />}
      </main>

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isAdmin={isAdmin}
      />

      <Toaster position="top-center" richColors />
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
