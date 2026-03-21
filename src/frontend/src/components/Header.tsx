import { useUser } from "@/context/UserContext";

interface Props {
  onCoinClick?: () => void;
}

export default function Header({ onCoinClick }: Props) {
  const { coins } = useUser();

  return (
    <header
      className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 flex items-center justify-between px-4 h-16"
      style={{
        background: "oklch(0.13 0.025 255 / 0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid oklch(0.3 0.04 255 / 0.3)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="text-xl">🏏</span>
        <span className="font-display font-700 text-foreground text-base tracking-wide">
          FansBattle
        </span>
      </div>

      {/* Coin balance — clickable → opens shop */}
      <button
        type="button"
        data-ocid="header.coins.button"
        onClick={onCoinClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95"
        style={{
          background: "oklch(0.22 0.04 255)",
          border: "1px solid oklch(0.35 0.06 80 / 0.4)",
        }}
      >
        <span className="text-base">🪙</span>
        <span
          className="font-display font-700 text-sm"
          style={{ color: "oklch(0.85 0.18 80)" }}
        >
          {coins.toLocaleString()}
        </span>
      </button>
    </header>
  );
}
