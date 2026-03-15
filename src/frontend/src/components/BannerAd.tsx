import { X } from "lucide-react";
import { useState } from "react";

export default function BannerAd() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="w-full flex items-center justify-between px-3 gap-2 shrink-0"
      style={{
        height: "52px",
        background:
          "linear-gradient(90deg, oklch(0.18 0.04 255 / 0.96), oklch(0.16 0.05 235 / 0.97))",
        borderTop: "1px solid oklch(0.65 0.18 220 / 0.25)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Ad badge */}
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
        style={{
          background: "oklch(0.55 0.15 220 / 0.3)",
          color: "oklch(0.75 0.15 220)",
          border: "1px solid oklch(0.55 0.15 220 / 0.4)",
          letterSpacing: "0.05em",
        }}
      >
        AD
      </span>

      {/* Content */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-xl shrink-0">🏏</span>
        <div className="flex flex-col min-w-0">
          <span
            className="text-xs font-bold truncate leading-tight"
            style={{ color: "oklch(0.9 0.05 220)" }}
          >
            DreamXI · Play Fantasy Cricket
          </span>
          <span
            className="text-[10px] truncate leading-tight"
            style={{ color: "oklch(0.65 0.08 220)" }}
          >
            Win big every match · Download Now
          </span>
        </div>
      </div>

      {/* CTA */}
      <button
        type="button"
        className="shrink-0 text-xs font-bold px-3 py-1 rounded-full"
        style={{
          background: "oklch(0.72 0.22 50)",
          color: "oklch(0.15 0.05 50)",
        }}
      >
        Install
      </button>

      {/* Dismiss */}
      <button
        type="button"
        data-ocid="banner_ad.close_button"
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded-full"
        style={{ color: "oklch(0.55 0.05 220)" }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
