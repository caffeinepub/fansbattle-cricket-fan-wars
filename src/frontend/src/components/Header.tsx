import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface Props {
  coins: number;
  onLogout: () => void;
  username?: string;
  avatar?: string;
}

export default function Header({ coins, onLogout, username, avatar }: Props) {
  return (
    <header
      className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 px-4 py-3 flex items-center justify-between"
      style={{
        background: "oklch(0.13 0.025 255 / 0.92)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid oklch(0.25 0.04 255 / 0.4)",
      }}
    >
      <div className="flex items-center gap-2">
        {avatar && username ? (
          <>
            <span className="text-2xl">{avatar}</span>
            <div>
              <h1
                className="font-display text-base font-800 leading-none"
                style={{ color: "oklch(0.88 0.12 50)" }}
              >
                {username}
              </h1>
              <p className="text-xs text-muted-foreground leading-none">
                Fan Warrior
              </p>
            </div>
          </>
        ) : (
          <>
            <span className="text-2xl">🏏</span>
            <div>
              <h1
                className="font-display text-lg font-800 leading-none text-glow-orange"
                style={{ color: "oklch(0.88 0.12 50)" }}
              >
                FansBattle
              </h1>
              <p className="text-xs text-muted-foreground leading-none">
                Cricket Fan Wars
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="coin-badge flex items-center gap-1 px-3 py-1 rounded-full">
          <span className="text-sm">🪙</span>
          <span className="font-display font-700 text-sm">
            {coins.toLocaleString()}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onLogout}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
