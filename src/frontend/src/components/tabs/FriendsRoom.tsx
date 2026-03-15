import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

const MOCK_MEMBERS = [
  { name: "Rahul_Fires", coins: 1240, avatar: "🔥" },
  { name: "CricketKing99", coins: 980, avatar: "👑" },
  { name: "IPL_Maniac", coins: 875, avatar: "⚡" },
  { name: "YourName", coins: 350, avatar: "🏏" },
  { name: "BattleQueen07", coins: 290, avatar: "⭐" },
];

const GLOBAL_LEADERBOARD = [
  { rank: 1, name: "ProBatsman_X", coins: 8750, avatar: "🥇" },
  { rank: 2, name: "CricketWizard", coins: 7320, avatar: "🥈" },
  { rank: 3, name: "Rohit_Fan_Club", coins: 6190, avatar: "🥉" },
  { rank: 4, name: "IND_Supporter", coins: 4420, avatar: "🏏" },
  { rank: 5, name: "SixMachine007", coins: 3890, avatar: "💥" },
];

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

interface Props {
  spendCoins: (n: number) => boolean;
}

const JOIN_COST = 10;

export default function FriendsRoom({ spendCoins }: Props) {
  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [activeRoom, setActiveRoom] = useState<{
    name: string;
    code: string;
  } | null>(null);

  const handleCreate = () => {
    if (!roomName.trim()) {
      toast.error("Enter a room name first!");
      return;
    }
    if (!spendCoins(JOIN_COST)) return;
    const code = generateCode();
    setActiveRoom({ name: roomName.trim(), code });
    toast.success(`🏠 Room created! Code: ${code}`);
  };

  const handleJoin = () => {
    if (joinCode.trim().length < 4) {
      toast.error("Enter a valid room code!");
      return;
    }
    if (!spendCoins(JOIN_COST)) return;
    setActiveRoom({
      name: "Battle Arena",
      code: joinCode.trim().toUpperCase(),
    });
    toast.success(`✅ Joined room ${joinCode.toUpperCase()}!`);
  };

  const handleCopyCode = () => {
    if (activeRoom) {
      void navigator.clipboard.writeText(activeRoom.code);
      toast.success("📋 Code copied!", { duration: 1500 });
    }
  };

  const handleLeave = () => {
    setActiveRoom(null);
    setRoomName("");
    setJoinCode("");
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">👥</span>
        <div>
          <h2 className="font-display text-xl font-800 text-foreground">
            Friends Room
          </h2>
          <p className="text-xs text-muted-foreground">Battle with your crew</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeRoom ? (
          <motion.div
            key="room"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Room Header */}
            <div className="card-glass rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Active Room
                  </p>
                  <h3 className="font-display text-lg font-800 text-foreground">
                    {activeRoom.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-display font-700 text-sm glow-blue"
                  style={{
                    background: "oklch(0.65 0.18 220 / 0.2)",
                    border: "1px solid oklch(0.65 0.18 220 / 0.5)",
                    color: "oklch(0.8 0.15 220)",
                  }}
                >
                  {activeRoom.code} 📋
                </button>
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  data-ocid="friends_room.invite.button"
                  onClick={handleCopyCode}
                  className="flex-1 h-9 text-sm font-700 text-accent-foreground"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.72 0.18 50), oklch(0.78 0.2 40))",
                  }}
                >
                  📤 Invite Friend
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLeave}
                  className="h-9 px-4 text-sm border-border text-muted-foreground hover:text-foreground"
                >
                  Leave
                </Button>
              </div>
            </div>

            {/* Member Leaderboard */}
            <div className="card-glass rounded-2xl p-4">
              <h3 className="font-display text-sm font-700 text-muted-foreground uppercase tracking-wider mb-3">
                Room Standings
              </h3>
              <div className="space-y-2">
                {MOCK_MEMBERS.map((member, i) => (
                  <div
                    key={member.name}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl"
                    style={{
                      background:
                        member.name === "YourName"
                          ? "oklch(0.65 0.18 220 / 0.1)"
                          : "oklch(0.22 0.04 255 / 0.5)",
                    }}
                  >
                    <span className="w-5 text-center text-sm font-700 text-muted-foreground">
                      #{i + 1}
                    </span>
                    <span className="text-xl">{member.avatar}</span>
                    <span className="flex-1 text-sm font-600 text-foreground">
                      {member.name}
                    </span>
                    <span
                      className="text-xs font-700"
                      style={{ color: "oklch(0.88 0.18 90)" }}
                    >
                      🪙 {member.coins.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="noroom"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Create Room */}
            <div className="card-glass rounded-2xl p-4 space-y-3">
              <h3 className="font-display text-base font-700 text-foreground">
                🏠 Create Room
              </h3>
              <Input
                data-ocid="friends_room.create.input"
                placeholder="Room name (e.g. T20 Warriors)"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
              <Button
                data-ocid="friends_room.create.button"
                onClick={handleCreate}
                className="w-full font-display font-700 text-accent-foreground"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.72 0.18 50), oklch(0.78 0.2 40))",
                }}
              >
                Create Room — {JOIN_COST} 🪙
              </Button>
            </div>

            {/* Join Room */}
            <div className="card-glass rounded-2xl p-4 space-y-3">
              <h3 className="font-display text-base font-700 text-foreground">
                🔗 Join Room
              </h3>
              <Input
                data-ocid="friends_room.join.input"
                placeholder="Enter 6-char code (e.g. IND786)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground uppercase tracking-widest"
                maxLength={6}
              />
              <Button
                data-ocid="friends_room.join.button"
                onClick={handleJoin}
                variant="outline"
                className="w-full font-display font-700 border-border text-foreground hover:bg-secondary"
              >
                Join Room — {JOIN_COST} 🪙
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Leaderboard */}
      <div className="card-glass rounded-2xl p-4">
        <h3 className="font-display text-sm font-700 text-muted-foreground uppercase tracking-wider mb-3">
          🌍 Global Leaderboard
        </h3>
        <div className="space-y-2">
          {GLOBAL_LEADERBOARD.map((player) => {
            const rankColor =
              player.rank === 1
                ? "oklch(0.88 0.18 90)"
                : player.rank === 2
                  ? "oklch(0.75 0.05 240)"
                  : player.rank === 3
                    ? "oklch(0.7 0.12 45)"
                    : "oklch(0.55 0.04 255)";
            return (
              <div
                key={player.name}
                className="flex items-center gap-3 px-3 py-2 rounded-xl"
                style={{ background: "oklch(0.22 0.04 255 / 0.5)" }}
              >
                <span className="text-xl">{player.avatar}</span>
                <span className="flex-1 text-sm font-600 text-foreground">
                  {player.name}
                </span>
                <span className="text-xs font-800" style={{ color: rankColor }}>
                  🪙 {player.coins.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
