import { useUser } from "@/context/UserContext";
import { LogOut } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  onLogout?: () => void;
}

export default function Header({ onLogout }: Props) {
  const { userData, coins, logout, isAdmin } = useUser();

  const handleLogout = async () => {
    await logout();
    onLogout?.();
  };

  return (
    <header
      className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 flex items-center justify-between px-4 h-16"
      style={{
        background: "oklch(0.13 0.025 255 / 0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid oklch(0.3 0.04 255 / 0.3)",
      }}
    >
      <div className="flex items-center gap-2">
        {userData?.avatar ? (
          <span className="text-2xl">{userData.avatar}</span>
        ) : null}
        <div>
          {userData?.username ? (
            <div className="flex items-center gap-1.5">
              <span className="font-display font-700 text-foreground text-sm">
                {userData.username}
              </span>
              {isAdmin && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-600"
                  style={{
                    background: "oklch(0.65 0.22 30)",
                    color: "white",
                  }}
                >
                  ADMIN
                </span>
              )}
            </div>
          ) : (
            <span className="font-display font-700 text-foreground text-sm">
              🏑 FansBattle
            </span>
          )}
          {!userData?.username && (
            <p className="text-muted-foreground text-xs">Cricket Fan Wars</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: "oklch(0.22 0.04 255)" }}
        >
          <span className="text-base">🪙</span>
          <span
            className="font-display font-700 text-sm"
            style={{ color: "oklch(0.85 0.18 80)" }}
          >
            {coins.toLocaleString()}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          data-ocid="header.logout_button"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
