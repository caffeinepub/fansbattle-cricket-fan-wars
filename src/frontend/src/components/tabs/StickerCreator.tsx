import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

const TEAM_COLORS = [
  {
    id: "mi",
    name: "MI",
    fullName: "Mumbai Indians",
    style: "linear-gradient(135deg, oklch(0.22 0.12 255), oklch(0.42 0.2 220))",
  },
  {
    id: "csk",
    name: "CSK",
    fullName: "Chennai Super Kings",
    style: "linear-gradient(135deg, oklch(0.35 0.15 80), oklch(0.62 0.22 70))",
  },
  {
    id: "rcb",
    name: "RCB",
    fullName: "Royal Challengers",
    style: "linear-gradient(135deg, oklch(0.25 0.1 15), oklch(0.45 0.2 20))",
  },
  {
    id: "kkr",
    name: "KKR",
    fullName: "Knight Riders",
    style: "linear-gradient(135deg, oklch(0.22 0.1 290), oklch(0.42 0.18 300))",
  },
  {
    id: "srh",
    name: "SRH",
    fullName: "Sunrisers",
    style: "linear-gradient(135deg, oklch(0.3 0.1 50), oklch(0.55 0.22 40))",
  },
  {
    id: "dc",
    name: "DC",
    fullName: "Delhi Capitals",
    style: "linear-gradient(135deg, oklch(0.22 0.12 240), oklch(0.4 0.18 250))",
  },
];

interface Character {
  id: string;
  emoji: string;
  label: string;
  premium?: boolean;
  cost?: number;
}

const CHARACTERS: Character[] = [
  { id: "batsman", emoji: "🏑", label: "Batsman Hero" },
  { id: "bowler", emoji: "⚡", label: "Bowler Beast" },
  { id: "keeper", emoji: "🧤", label: "Wicket Keeper" },
  { id: "fielder", emoji: "🤸", label: "Fielder Ace" },
  { id: "spin", emoji: "🌀", label: "Spin Wizard" },
  { id: "fast", emoji: "💨", label: "Fast Fury" },
  { id: "legend", emoji: "🦱", label: "Legend Lion", premium: true, cost: 25 },
  { id: "goat", emoji: "🐐", label: "GOAT Master", premium: true, cost: 25 },
  { id: "warrior", emoji: "⚔️", label: "Warrior King", premium: true, cost: 25 },
];

interface Props {
  addCoins: (n: number, type: string) => Promise<void>;
  spendCoins: (n: number, type: string) => Promise<boolean>;
}

export default function StickerCreator({ spendCoins }: Props) {
  const [teamColor, setTeamColor] = useState("mi");
  const [character, setCharacter] = useState("batsman");
  const [caption, setCaption] = useState("");
  const [created, setCreated] = useState(false);
  const [unlockedPremium, setUnlockedPremium] = useState<string[]>([]);

  const selectedTeam = TEAM_COLORS.find((t) => t.id === teamColor)!;
  const selectedChar = CHARACTERS.find((c) => c.id === character)!;

  const handleCharacterClick = async (c: Character) => {
    if (c.premium && !unlockedPremium.includes(c.id)) {
      const ok = await spendCoins(c.cost ?? 25, "premium_sticker");
      if (ok) {
        setUnlockedPremium((prev) => [...prev, c.id]);
        setCharacter(c.id);
        toast.success("🔓 Premium character unlocked!", { duration: 2500 });
      }
    } else {
      setCharacter(c.id);
    }
  };

  const handleCreate = () => {
    setCreated(true);
    toast.success("🎨 Sticker created!", { duration: 2000 });
  };

  const handleShare = async () => {
    const shareData = {
      title: "My Cricket Sticker – FansBattle",
      text: caption
        ? `${caption} — Created with FansBattle! 🏑🔥`
        : "Check out my cricket sticker on FansBattle! 🏑🔥",
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.text);
        toast.success("Link copied!", { duration: 2500 });
      }
    } catch {
      toast.success("Link copied!", { duration: 2500 });
    }
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">✨</span>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Sticker Creator
          </h2>
          <p className="text-xs text-muted-foreground">
            Design your fan sticker
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={created ? "created" : "preview"}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="card-glass rounded-2xl p-4 text-center"
        >
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-semibold">
            {created ? "Your Sticker" : "Live Preview"}
          </p>
          <div
            className="sticker-canvas mx-auto"
            style={{ background: selectedTeam.style }}
          >
            <span className="text-6xl leading-none select-none">
              {selectedChar.emoji}
            </span>
            {caption && (
              <span
                className="absolute bottom-3 left-2 right-2 text-center text-xs font-bold text-white leading-tight"
                style={{ textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}
              >
                {caption}
              </span>
            )}
          </div>
          {created && (
            <div className="flex gap-2 mt-4">
              <Button
                data-ocid="sticker.edit.button"
                variant="outline"
                onClick={() => setCreated(false)}
                className="flex-1 border-border text-muted-foreground"
              >
                Edit
              </Button>
              <Button
                data-ocid="sticker.share.button"
                onClick={handleShare}
                className="flex-1 font-bold glow-orange"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.72 0.18 50), oklch(0.78 0.2 40))",
                }}
              >
                📤 Share
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {!created && (
        <>
          <div className="card-glass rounded-2xl p-4">
            <p className="text-sm font-bold text-foreground mb-3">
              Choose Team Color
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {TEAM_COLORS.map((t, i) => (
                <button
                  type="button"
                  key={t.id}
                  data-ocid={`sticker.team_color.item.${i + 1}`}
                  onClick={() => setTeamColor(t.id)}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5 transition-all"
                >
                  <div
                    className="h-10 rounded-full transition-all"
                    style={{
                      background: t.style,
                      width: "80px",
                      border:
                        teamColor === t.id
                          ? "2px solid oklch(0.88 0.18 90)"
                          : "2px solid transparent",
                      boxShadow:
                        teamColor === t.id
                          ? "0 0 10px oklch(0.88 0.18 90 / 0.6)"
                          : "none",
                    }}
                  />
                  <span
                    className="text-xs font-semibold"
                    style={{
                      color:
                        teamColor === t.id
                          ? "oklch(0.88 0.18 90)"
                          : "oklch(0.65 0.04 255)",
                    }}
                  >
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="card-glass rounded-2xl p-4">
            <p className="text-sm font-bold text-foreground mb-3">
              Choose Character
            </p>
            <div className="grid grid-cols-3 gap-2">
              {CHARACTERS.map((c, i) => {
                const isPremiumLocked =
                  c.premium && !unlockedPremium.includes(c.id);
                const isPremiumUnlocked =
                  c.premium && unlockedPremium.includes(c.id);
                const isSelected = character === c.id;
                return (
                  <button
                    type="button"
                    key={c.id}
                    data-ocid={`sticker.character.item.${i + 1}`}
                    onClick={() => handleCharacterClick(c)}
                    className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative overflow-hidden"
                    style={{
                      background: isSelected
                        ? "oklch(0.65 0.18 220 / 0.25)"
                        : isPremiumLocked
                          ? "oklch(0.18 0.04 80 / 0.8)"
                          : "oklch(0.22 0.04 255 / 0.5)",
                      border: `1.5px solid ${isSelected ? "oklch(0.88 0.18 90)" : isPremiumLocked ? "oklch(0.65 0.15 80 / 0.5)" : "oklch(0.32 0.06 255)"}`,
                      boxShadow: isSelected
                        ? "0 0 12px oklch(0.88 0.18 90 / 0.45)"
                        : "none",
                    }}
                  >
                    {!c.premium && (
                      <span
                        className="absolute top-1 right-1 text-[9px] font-bold px-1 py-0.5 rounded"
                        style={{
                          background: "oklch(0.45 0.18 145)",
                          color: "white",
                        }}
                      >
                        FREE
                      </span>
                    )}
                    {isPremiumLocked && (
                      <span
                        className="absolute top-1 right-1 text-[9px] font-bold px-1 py-0.5 rounded"
                        style={{
                          background: "oklch(0.5 0.18 80)",
                          color: "white",
                        }}
                      >
                        25🪙
                      </span>
                    )}
                    {isPremiumUnlocked && (
                      <span className="absolute top-1 right-1 text-[9px]">
                        👑
                      </span>
                    )}
                    {isPremiumLocked ? (
                      <>
                        <span className="text-3xl opacity-40">{c.emoji}</span>
                        <span className="text-lg">🔒</span>
                      </>
                    ) : (
                      <span className="text-4xl">{c.emoji}</span>
                    )}
                    <span
                      className="text-[10px] font-semibold text-center leading-tight px-1"
                      style={{
                        color: isPremiumLocked
                          ? "oklch(0.55 0.08 80)"
                          : "oklch(0.75 0.04 255)",
                      }}
                    >
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              👑 Premium characters cost 25 🪙 to unlock
            </p>
          </div>

          <div className="card-glass rounded-2xl p-4">
            <p className="text-sm font-bold text-foreground mb-3">
              Add Caption
            </p>
            <Input
              data-ocid="sticker.caption.input"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Jeetega Bhai India! 🔥"
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {caption.length}/30
            </p>
          </div>

          <Button
            data-ocid="sticker.create.button"
            onClick={handleCreate}
            className="w-full h-12 font-bold text-lg glow-orange"
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
