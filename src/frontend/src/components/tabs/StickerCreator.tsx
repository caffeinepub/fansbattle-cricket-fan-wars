import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

interface AvatarItem {
  id: string;
  emoji: string;
  label: string;
  premium?: boolean;
  cost?: number;
}

const AVATARS: AvatarItem[] = [
  { id: "bat", emoji: "🏏", label: "Batsman" },
  { id: "ball", emoji: "⚡", label: "Bowler" },
  { id: "keeper", emoji: "🧤", label: "Keeper" },
  { id: "field", emoji: "🤸", label: "Fielder" },
  { id: "ump", emoji: "👆", label: "Umpire" },
  { id: "fan", emoji: "🎉", label: "Fan" },
  { id: "legend", emoji: "🦁", label: "Legend", premium: true, cost: 25 },
  { id: "goat", emoji: "🐐", label: "GOAT", premium: true, cost: 25 },
  { id: "warrior", emoji: "⚔️", label: "Warrior", premium: true, cost: 25 },
];

const BADGES = [
  { id: "fire", emoji: "🔥" },
  { id: "crown", emoji: "👑" },
  { id: "lightning", emoji: "⚡" },
  { id: "star", emoji: "⭐" },
  { id: "shield", emoji: "🛡️" },
];

const BACKGROUNDS = [
  {
    id: "blue",
    style:
      "linear-gradient(135deg, oklch(0.25 0.12 255), oklch(0.45 0.18 220))",
  },
  {
    id: "orange",
    style: "linear-gradient(135deg, oklch(0.3 0.1 50), oklch(0.55 0.2 40))",
  },
  {
    id: "green",
    style: "linear-gradient(135deg, oklch(0.25 0.1 140), oklch(0.45 0.18 160))",
  },
  {
    id: "purple",
    style: "linear-gradient(135deg, oklch(0.25 0.1 290), oklch(0.45 0.18 300))",
  },
  {
    id: "gold",
    style: "linear-gradient(135deg, oklch(0.35 0.12 80), oklch(0.6 0.2 70))",
  },
  {
    id: "red",
    style: "linear-gradient(135deg, oklch(0.25 0.1 15), oklch(0.45 0.2 20))",
  },
];

interface Props {
  addCoins: (n: number) => void;
  spendCoins: (n: number) => boolean;
}

export default function StickerCreator({ spendCoins }: Props) {
  const [avatar, setAvatar] = useState("bat");
  const [chant, setChant] = useState("");
  const [badge, setBadge] = useState("fire");
  const [bg, setBg] = useState("blue");
  const [created, setCreated] = useState(false);
  const [unlockedPremium, setUnlockedPremium] = useState<string[]>([]);

  const selectedAvatar = AVATARS.find((a) => a.id === avatar)!;
  const selectedBadge = BADGES.find((b) => b.id === badge)!;
  const selectedBg = BACKGROUNDS.find((b) => b.id === bg)!;

  const handleAvatarClick = (a: AvatarItem) => {
    if (a.premium && !unlockedPremium.includes(a.id)) {
      if (spendCoins(a.cost ?? 25)) {
        setUnlockedPremium((prev) => [...prev, a.id]);
        setAvatar(a.id);
        toast.success("🔓 Premium avatar unlocked!", { duration: 2500 });
      }
    } else {
      setAvatar(a.id);
    }
  };

  const handleCreate = () => {
    setCreated(true);
    toast.success("🎨 Sticker created!", { duration: 2000 });
  };

  const handleShare = () => {
    toast.success("📤 Sticker saved to your collection!", { duration: 2500 });
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">✨</span>
        <div>
          <h2 className="font-display text-xl font-800 text-foreground">
            Sticker Creator
          </h2>
          <p className="text-xs text-muted-foreground">
            Design your fan sticker
          </p>
        </div>
      </div>

      {/* Preview */}
      <AnimatePresence mode="wait">
        {created ? (
          <motion.div
            key="created"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-glass rounded-2xl p-4 text-center"
          >
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-600">
              Your Sticker
            </p>
            <div
              className="sticker-canvas mx-auto max-w-[200px] flex-col gap-2"
              style={{ background: selectedBg.style }}
            >
              <div className="text-6xl">{selectedAvatar.emoji}</div>
              <div className="text-2xl">{selectedBadge.emoji}</div>
              {chant && (
                <div className="absolute bottom-4 left-2 right-2 text-center">
                  <span
                    className="text-xs font-700 text-white text-shadow"
                    style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
                  >
                    {chant}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setCreated(false)}
                className="flex-1 border-border text-muted-foreground"
              >
                Edit
              </Button>
              <Button
                data-ocid="sticker.share.button"
                onClick={handleShare}
                className="flex-1 font-700 text-accent-foreground"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.72 0.18 50), oklch(0.78 0.2 40))",
                }}
              >
                📤 Share
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="preview" className="card-glass rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-600 text-center">
              Preview
            </p>
            <div
              className="sticker-canvas mx-auto max-w-[180px] flex-col gap-2"
              style={{ background: selectedBg.style }}
            >
              <div className="text-5xl">{selectedAvatar.emoji}</div>
              <div className="text-xl">{selectedBadge.emoji}</div>
              {chant && (
                <div className="absolute bottom-3 left-2 right-2 text-center">
                  <span
                    className="text-xs font-700 text-white"
                    style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
                  >
                    {chant}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!created && (
        <>
          {/* Avatar Picker */}
          <div className="card-glass rounded-2xl p-4">
            <p className="text-sm font-700 text-foreground mb-3">
              Choose Avatar
            </p>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((a, idx) => {
                const isPremiumLocked =
                  a.premium && !unlockedPremium.includes(a.id);
                return (
                  <button
                    type="button"
                    key={a.id}
                    data-ocid={
                      a.premium
                        ? `sticker.premium_unlock.button.${idx + 1}`
                        : undefined
                    }
                    onClick={() => handleAvatarClick(a)}
                    className="aspect-square rounded-xl flex items-center justify-center text-2xl transition-all relative overflow-hidden"
                    style={{
                      background:
                        avatar === a.id
                          ? "oklch(0.65 0.18 220 / 0.3)"
                          : isPremiumLocked
                            ? "oklch(0.18 0.04 80)"
                            : "oklch(0.22 0.04 255)",
                      border: `1px solid ${
                        avatar === a.id
                          ? "oklch(0.65 0.18 220)"
                          : isPremiumLocked
                            ? "oklch(0.6 0.15 80 / 0.6)"
                            : "oklch(0.3 0.04 255)"
                      }`,
                      boxShadow:
                        avatar === a.id
                          ? "0 0 10px oklch(0.65 0.18 220 / 0.4)"
                          : isPremiumLocked
                            ? "0 0 8px oklch(0.6 0.15 80 / 0.3)"
                            : "none",
                    }}
                  >
                    {isPremiumLocked ? (
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-base">🔒</span>
                        <span
                          className="text-[8px] font-700 mt-0.5"
                          style={{ color: "oklch(0.75 0.15 80)" }}
                        >
                          25🪙
                        </span>
                      </div>
                    ) : (
                      <span>{a.emoji}</span>
                    )}
                    {a.premium && unlockedPremium.includes(a.id) && (
                      <span className="absolute top-0.5 right-0.5 text-[8px]">
                        👑
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              👑 Premium avatars cost 25 🪙 to unlock
            </p>
          </div>

          {/* Chant Input */}
          <div className="card-glass rounded-2xl p-4">
            <p className="text-sm font-700 text-foreground mb-3">
              Add Fan Chant
            </p>
            <Input
              data-ocid="sticker.editor"
              value={chant}
              onChange={(e) => setChant(e.target.value)}
              placeholder="e.g. Jeetega Bhai India!"
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              maxLength={30}
            />
          </div>

          {/* Badge & BG */}
          <div className="card-glass rounded-2xl p-4">
            <p className="text-sm font-700 text-foreground mb-3">Badge</p>
            <div className="flex gap-2">
              {BADGES.map((b) => (
                <button
                  type="button"
                  key={b.id}
                  onClick={() => setBadge(b.id)}
                  className="flex-1 aspect-square rounded-xl text-2xl flex items-center justify-center transition-all"
                  style={{
                    background:
                      badge === b.id
                        ? "oklch(0.88 0.18 90 / 0.2)"
                        : "oklch(0.22 0.04 255)",
                    border: `1px solid ${
                      badge === b.id
                        ? "oklch(0.88 0.18 90)"
                        : "oklch(0.3 0.04 255)"
                    }`,
                  }}
                >
                  {b.emoji}
                </button>
              ))}
            </div>

            <p className="text-sm font-700 text-foreground mb-3 mt-4">
              Background
            </p>
            <div className="grid grid-cols-6 gap-2">
              {BACKGROUNDS.map((b) => (
                <button
                  type="button"
                  key={b.id}
                  onClick={() => setBg(b.id)}
                  className="aspect-square rounded-xl transition-all"
                  style={{
                    background: b.style,
                    border: `2px solid ${
                      bg === b.id ? "oklch(0.88 0.18 90)" : "transparent"
                    }`,
                    boxShadow:
                      bg === b.id
                        ? "0 0 8px oklch(0.88 0.18 90 / 0.5)"
                        : "none",
                  }}
                />
              ))}
            </div>
          </div>

          <Button
            data-ocid="sticker.create.button"
            onClick={handleCreate}
            className="w-full h-12 font-display font-700 text-lg text-accent-foreground glow-orange"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.72 0.18 50), oklch(0.78 0.2 40))",
            }}
          >
            ✨ Create Sticker
          </Button>
        </>
      )}
    </div>
  );
}
