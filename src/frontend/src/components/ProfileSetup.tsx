import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

const AVATARS = [
  "🏏",
  "🏆",
  "🔥",
  "⚡",
  "🦁",
  "🐯",
  "🦅",
  "🐉",
  "💪",
  "🎯",
  "👑",
  "⭐",
];

const TEAMS = [
  {
    name: "Mumbai Titans",
    color: "#1e73be",
    bg: "oklch(0.45 0.15 240)",
    emoji: "🔵",
  },
  {
    name: "Chennai Kings",
    color: "#f0c020",
    bg: "oklch(0.75 0.18 80)",
    emoji: "🟡",
  },
  {
    name: "Bangalore Warriors",
    color: "#cc1a1a",
    bg: "oklch(0.48 0.2 25)",
    emoji: "🔴",
  },
  {
    name: "Kolkata Royals",
    color: "#7e40cc",
    bg: "oklch(0.48 0.18 300)",
    emoji: "🟣",
  },
  {
    name: "Delhi Daredevils",
    color: "#1a3a8f",
    bg: "oklch(0.35 0.14 258)",
    emoji: "🔵",
  },
  {
    name: "Punjab Stallions",
    color: "#8b1a1a",
    bg: "oklch(0.38 0.18 20)",
    emoji: "🔴",
  },
  {
    name: "Rajasthan Legends",
    color: "#cc2d7a",
    bg: "oklch(0.52 0.2 340)",
    emoji: "🩷",
  },
  {
    name: "Hyderabad Sunrisers",
    color: "#e06010",
    bg: "oklch(0.6 0.18 55)",
    emoji: "🟠",
  },
  {
    name: "Gujarat Giants",
    color: "#1aaa8a",
    bg: "oklch(0.58 0.14 175)",
    emoji: "🟢",
  },
  {
    name: "Lucknow Lions",
    color: "#4ab8e0",
    bg: "oklch(0.65 0.13 215)",
    emoji: "🩵",
  },
];

interface Props {
  onComplete: (username: string, avatar: string, favoriteTeam: string) => void;
}

export default function ProfileSetup({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");

  const canNext =
    (step === 1 && username.trim().length >= 3) ||
    (step === 2 && selectedAvatar !== "") ||
    (step === 3 && selectedTeam !== "");

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete(username.trim(), selectedAvatar, selectedTeam);
    }
  };

  const stepTitles = [
    "Choose a Username",
    "Pick Your Avatar",
    "Your Favorite Team",
  ];
  const stepSubtitles = [
    "This is how other fans will know you",
    "Pick an emoji that represents you",
    "Choose the team you bleed for",
  ];

  return (
    <div className="app-shell flex flex-col items-center justify-center min-h-dvh stadium-gradient relative overflow-hidden">
      {/* Background decoration */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, oklch(0.13 0.025 255) 0%, oklch(0.10 0.03 270) 100%)",
        }}
      />
      <div
        className="absolute top-0 left-0 right-0 h-64 opacity-20"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, oklch(0.65 0.18 50) 0%, transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm px-6"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏟️</div>
          <h1
            className="font-display text-2xl font-800"
            style={{ color: "oklch(0.88 0.12 50)" }}
          >
            Set Up Profile
          </h1>
          <p className="text-muted-foreground text-xs mt-1 tracking-wider uppercase">
            Step {step} of 3
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="flex-1 h-1 rounded-full transition-all duration-500"
              style={{
                background:
                  s <= step
                    ? "linear-gradient(90deg, oklch(0.72 0.18 50), oklch(0.78 0.2 40))"
                    : "oklch(0.25 0.04 255)",
              }}
            />
          ))}
        </div>

        {/* Step card */}
        <div className="card-glass rounded-2xl p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="font-display text-xl font-700 text-foreground mb-1">
                {stepTitles[step - 1]}
              </h2>
              <p className="text-muted-foreground text-sm mb-5">
                {stepSubtitles[step - 1]}
              </p>

              {/* Step 1: Username */}
              {step === 1 && (
                <div className="space-y-3">
                  <Input
                    data-ocid="profile_setup.username_input"
                    type="text"
                    placeholder="e.g. CricketKing007"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={20}
                    className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-12"
                  />
                  {username.length > 0 && username.trim().length < 3 && (
                    <p
                      className="text-xs"
                      style={{ color: "oklch(0.65 0.18 25)" }}
                    >
                      Username must be at least 3 characters
                    </p>
                  )}
                  {username.trim().length >= 3 && (
                    <p
                      className="text-xs"
                      style={{ color: "oklch(0.7 0.15 150)" }}
                    >
                      ✓ Looks great!
                    </p>
                  )}
                </div>
              )}

              {/* Step 2: Avatar */}
              {step === 2 && (
                <div className="grid grid-cols-4 gap-3">
                  {AVATARS.map((emoji, i) => (
                    <motion.button
                      key={emoji}
                      data-ocid={`profile_setup.avatar.item.${i + 1}`}
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedAvatar(emoji)}
                      className="aspect-square rounded-xl text-2xl flex items-center justify-center transition-all duration-200"
                      style={{
                        background:
                          selectedAvatar === emoji
                            ? "linear-gradient(135deg, oklch(0.72 0.18 50), oklch(0.78 0.2 40))"
                            : "oklch(0.2 0.03 255)",
                        border:
                          selectedAvatar === emoji
                            ? "2px solid oklch(0.78 0.2 40)"
                            : "2px solid oklch(0.25 0.04 255)",
                        transform:
                          selectedAvatar === emoji ? "scale(1.1)" : "scale(1)",
                      }}
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Step 3: Team */}
              {step === 3 && (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {TEAMS.map((team, i) => (
                    <motion.button
                      key={team.name}
                      data-ocid={`profile_setup.team.item.${i + 1}`}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedTeam(team.name)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left"
                      style={{
                        background:
                          selectedTeam === team.name
                            ? `${team.bg} / 0.3`
                            : "oklch(0.2 0.03 255)",
                        border:
                          selectedTeam === team.name
                            ? `2px solid ${team.color}`
                            : "2px solid oklch(0.25 0.04 255)",
                      }}
                    >
                      <span
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ background: team.color }}
                      />
                      <span className="font-display font-600 text-foreground text-sm">
                        {team.name}
                      </span>
                      {selectedTeam === team.name && (
                        <span className="ml-auto text-sm">✓</span>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-6">
            {step < 3 ? (
              <Button
                data-ocid="profile_setup.next_button"
                onClick={handleNext}
                disabled={!canNext}
                className="w-full h-12 font-display font-700 text-accent-foreground glow-orange"
                style={{
                  background: canNext
                    ? "linear-gradient(135deg, oklch(0.72 0.18 50), oklch(0.78 0.2 40))"
                    : "oklch(0.25 0.04 255)",
                }}
              >
                Next Step →
              </Button>
            ) : (
              <Button
                data-ocid="profile_setup.submit_button"
                onClick={handleNext}
                disabled={!canNext}
                className="w-full h-12 font-display font-700 text-accent-foreground glow-orange"
                style={{
                  background: canNext
                    ? "linear-gradient(135deg, oklch(0.65 0.18 140), oklch(0.7 0.2 150))"
                    : "oklch(0.25 0.04 255)",
                }}
              >
                🚀 Enter the Arena!
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          You'll start with 100 coins 🪙
        </p>
      </motion.div>
    </div>
  );
}
