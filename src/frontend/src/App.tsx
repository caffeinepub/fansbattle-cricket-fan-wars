import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import LoginScreen from "@/components/LoginScreen";
import ShopModal from "@/components/ShopModal";
import SplashScreen from "@/components/SplashScreen";
import HomeTab from "@/components/tabs/HomeTab";
import ProfileTab from "@/components/tabs/ProfileTab";
import { Toaster } from "@/components/ui/sonner";
import { UserContextProvider, useUser } from "@/context/UserContext";
import { useEffect, useState } from "react";

export type TabId = "home" | "profile";

type AppState = "splash" | "loading" | "login" | "main";

function AppInner() {
  const { deviceId, loading } = useUser();
  const [appState, setAppState] = useState<AppState>("splash");
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [showShop, setShowShop] = useState(false);

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

  return (
    <div className="app-shell stadium-gradient flex flex-col">
      <Header onCoinClick={() => setShowShop(true)} />

      <main
        className="flex-1 overflow-y-auto pb-20"
        style={{ paddingTop: "64px" }}
      >
        {activeTab === "home" && <HomeTab />}
        {activeTab === "profile" && (
          <ProfileTab onOpenShop={() => setShowShop(true)} />
        )}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <ShopModal open={showShop} onClose={() => setShowShop(false)} />

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
