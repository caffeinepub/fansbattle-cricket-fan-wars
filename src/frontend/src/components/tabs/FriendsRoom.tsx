import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/context/UserContext";
import { db } from "@/lib/firebase";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const ENTRY_FEE = 20;
const WIN_REWARD = 70;

interface Props {
  spendCoins: (n: number, type: string, roomId?: string) => Promise<boolean>;
  addCoins: (n: number, type: string, roomId?: string) => Promise<void>;
  username: string;
  onGameEnd?: () => void;
}

type CardState = "idle" | "selected" | "resolving" | "correct" | "wrong";

const PREDICTIONS = [
  {
    id: 1,
    question: "Who Will Win?",
    options: ["Team A", "Team B"],
    emoji: "🏆",
    timer: 30,
  },
  {
    id: 2,
    question: "Next Wicket?",
    options: ["Yes (next 2 overs)", "No wicket"],
    emoji: "🎳",
    timer: 20,
  },
  {
    id: 3,
    question: "Next Six?",
    options: ["Yes", "No"],
    emoji: "💥",
    timer: 15,
  },
  {
    id: 4,
    question: "Over Runs > 10?",
    options: ["Yes", "No"],
    emoji: "📊",
    timer: 25,
  },
];

interface RoomData {
  id: string;
  roomId: string;
  creatorId: string;
  players: string[];
  entryCoins: number;
  totalPool: number;
  winner: string | null;
  status: string;
}

export default function FriendsRoom({
  spendCoins,
  addCoins,
  username,
  onGameEnd,
}: Props) {
  const { userId } = useUser();
  const [view, setView] = useState<"lobby" | "room">("lobby");
  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [activeRoom, setActiveRoom] = useState<RoomData | null>(null);
  const [cardStates, setCardStates] = useState<Record<number, CardState>>(
    Object.fromEntries(PREDICTIONS.map((p) => [p.id, "idle" as CardState])),
  );
  const [cardSelections, setCardSelections] = useState<Record<number, string>>(
    {},
  );
  const [cardTimers, setCardTimers] = useState<Record<number, number>>(
    Object.fromEntries(PREDICTIONS.map((p) => [p.id, p.timer])),
  );
  const [leaderboard, setLeaderboard] = useState<
    { name: string; score: number; isYou: boolean }[]
  >([]);
  const timerRefs = useRef<Record<number, ReturnType<typeof setInterval>>>({});

  // Pre-fill join code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("room");
    if (code) setJoinCode(code.toUpperCase());
  }, []);

  // Subscribe to active room
  useEffect(() => {
    if (!activeRoom?.id) return;
    const unsub = onSnapshot(doc(db, "rooms", activeRoom.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setActiveRoom((prev) =>
          prev ? ({ ...prev, ...data, id: snap.id } as RoomData) : null,
        );
        const players: string[] = data.players || [];
        setLeaderboard(
          players.map((p, i) => ({
            name: p === userId ? username || "You" : `Fan${i + 1}`,
            score: 0,
            isYou: p === userId,
          })),
        );
      }
    });
    return unsub;
  }, [activeRoom?.id, userId, username]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      Object.values(timerRefs.current).forEach(clearInterval);
    };
  }, []);

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from(
      { length: 6 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
  };

  const handleCreate = async () => {
    if (!userId) return;
    if (!roomName.trim()) {
      toast.error("Enter a room name");
      return;
    }
    const ok = await spendCoins(ENTRY_FEE, "room_entry");
    if (!ok) return;

    const code = generateCode();
    const roomRef = await addDoc(collection(db, "rooms"), {
      roomId: code,
      creatorId: userId,
      players: [userId],
      entryCoins: ENTRY_FEE,
      totalPool: ENTRY_FEE,
      winner: null,
      status: "waiting",
      createdAt: serverTimestamp(),
    });

    setActiveRoom({
      id: roomRef.id,
      roomId: code,
      creatorId: userId,
      players: [userId],
      entryCoins: ENTRY_FEE,
      totalPool: ENTRY_FEE,
      winner: null,
      status: "waiting",
    });
    setView("room");
    toast.success(`🏠 Room created! Code: ${code}`);
  };

  const handleJoin = async () => {
    if (!userId) return;
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      toast.error("Enter a 6-character room code");
      return;
    }
    const ok = await spendCoins(ENTRY_FEE, "room_entry");
    if (!ok) return;

    try {
      const snap = await getDocs(
        query(collection(db, "rooms"), where("roomId", "==", code)),
      );
      if (snap.empty) {
        toast.error("Room not found!");
        await addCoins(ENTRY_FEE, "room_entry_refund");
        return;
      }
      const roomDoc = snap.docs[0];
      await updateDoc(doc(db, "rooms", roomDoc.id), {
        players: arrayUnion(userId),
        totalPool: increment(ENTRY_FEE),
      });
      const data = roomDoc.data();
      setActiveRoom({
        id: roomDoc.id,
        roomId: data.roomId,
        creatorId: data.creatorId,
        players: [...(data.players || []), userId],
        entryCoins: data.entryCoins,
        totalPool: (data.totalPool || 0) + ENTRY_FEE,
        winner: data.winner || null,
        status: data.status || "waiting",
      });
      setView("room");
      toast.success(`👋 Joined room ${code}!`);
    } catch {
      toast.error("Failed to join room.");
      await addCoins(ENTRY_FEE, "room_entry_refund");
    }
  };

  const handleInvite = () => {
    if (!activeRoom) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${activeRoom.roomId}`;
    void navigator.clipboard.writeText(url);
    toast.success("📎 Invite link copied!");
  };

  const handleLeave = () => {
    Object.values(timerRefs.current).forEach(clearInterval);
    setActiveRoom(null);
    setView("lobby");
    setCardStates(
      Object.fromEntries(PREDICTIONS.map((p) => [p.id, "idle" as CardState])),
    );
    setCardSelections({});
    setCardTimers(Object.fromEntries(PREDICTIONS.map((p) => [p.id, p.timer])));
    setLeaderboard([]);
  };

  const selectPrediction = (cardId: number, option: string) => {
    if (cardStates[cardId] !== "idle") return;
    setCardSelections((prev) => ({ ...prev, [cardId]: option }));
    setCardStates((prev) => ({ ...prev, [cardId]: "selected" }));

    const pred = PREDICTIONS.find((p) => p.id === cardId)!;
    let remaining = pred.timer;
    setCardStates((prev) => ({ ...prev, [cardId]: "resolving" }));

    const interval = setInterval(async () => {
      remaining -= 1;
      setCardTimers((prev) => ({ ...prev, [cardId]: remaining }));

      if (remaining <= 0) {
        clearInterval(interval);
        delete timerRefs.current[cardId];

        const correct = Math.random() < 0.5;
        setCardStates((prev) => ({
          ...prev,
          [cardId]: correct ? "correct" : "wrong",
        }));

        if (correct) {
          await addCoins(WIN_REWARD, "room_winner", activeRoom?.roomId);
          if (activeRoom?.id) {
            await updateDoc(doc(db, "rooms", activeRoom.id), {
              winner: userId,
              status: "completed",
            });
          }
          setLeaderboard((prev) =>
            [...prev]
              .map((p) => (p.isYou ? { ...p, score: p.score + WIN_REWARD } : p))
              .sort((a, b) => b.score - a.score),
          );
          toast.success(`🏆 Winner! +${WIN_REWARD} 🪙`, { duration: 3000 });
          onGameEnd?.();
        } else {
          toast.error("❌ Wrong prediction!", { duration: 2000 });
        }
      }
    }, 1000);

    timerRefs.current[cardId] = interval;
  };

  // Lobby View
  if (view === "lobby") {
    return (
      <div className="px-4 py-6 space-y-5">
        <div>
          <h2 className="font-display text-xl font-800 text-foreground">
            👥 Friends Room
          </h2>
          <p className="text-muted-foreground text-xs mt-0.5">
            Play with friends, win big!
          </p>
        </div>

        <div className="card-glass rounded-2xl p-5 space-y-3">
          <h3 className="font-display text-base font-700 text-foreground">
            ➕ Create Room
          </h3>
          <Input
            data-ocid="friends_room.create.name_input"
            placeholder="Room name (e.g. My Battle)"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-11"
          />
          <Button
            data-ocid="friends_room.create.button"
            onClick={handleCreate}
            disabled={!roomName.trim()}
            className="w-full h-11 font-display font-700"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.72 0.18 50), oklch(0.76 0.2 40))",
              color: "oklch(0.12 0.02 50)",
            }}
          >
            Create Room — {ENTRY_FEE} 🪙
          </Button>
        </div>

        <div className="card-glass rounded-2xl p-5 space-y-3">
          <h3 className="font-display text-base font-700 text-foreground">
            🔗 Join Room
          </h3>
          <Input
            data-ocid="friends_room.join.code_input"
            placeholder="Enter 6-char room code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-11 tracking-widest text-center text-lg font-700 uppercase"
          />
          <Button
            data-ocid="friends_room.join.button"
            onClick={handleJoin}
            disabled={joinCode.length !== 6}
            className="w-full h-11 font-display font-700"
            style={{
              background: "oklch(0.45 0.18 260 / 0.3)",
              border: "1px solid oklch(0.6 0.18 260 / 0.5)",
              color: "oklch(0.85 0.12 260)",
            }}
          >
            Join Room — {ENTRY_FEE} 🪙
          </Button>
        </div>

        <div className="card-glass rounded-2xl p-4 space-y-2">
          <h3 className="font-display text-sm font-700 text-foreground mb-2">
            ℹ️ How it works
          </h3>
          {[
            { icon: "🎫", text: `Pay ${ENTRY_FEE} coins entry fee` },
            { icon: "🔗", text: "Invite friends with your room code" },
            { icon: "🏑", text: "Predict match events" },
            { icon: "🏆", text: `Winner gets ${WIN_REWARD} coins!` },
          ].map((step) => (
            <div key={step.icon} className="flex items-center gap-3">
              <span className="text-xl">{step.icon}</span>
              <span className="text-sm text-muted-foreground">{step.text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="card-glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-display font-700 text-foreground">
              🏠 Room Active
            </h3>
            <p className="text-xs text-muted-foreground">
              {activeRoom?.players.length || 0} players joined
            </p>
          </div>
          <div
            className="px-3 py-1 rounded-xl"
            style={{ background: "oklch(0.22 0.04 255)" }}
          >
            <span
              className="font-display font-800 text-lg tracking-widest"
              style={{ color: "oklch(0.85 0.18 50)" }}
            >
              {activeRoom?.roomId}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            data-ocid="friends_room.invite.button"
            onClick={handleInvite}
            size="sm"
            className="flex-1 h-9 text-xs font-700"
            style={{
              background: "oklch(0.45 0.18 260 / 0.3)",
              border: "1px solid oklch(0.6 0.18 260 / 0.5)",
              color: "oklch(0.85 0.12 260)",
            }}
          >
            🔗 Invite Friends
          </Button>
          <Button
            data-ocid="friends_room.leave.button"
            onClick={handleLeave}
            size="sm"
            variant="ghost"
            className="h-9 text-xs text-muted-foreground hover:text-foreground"
          >
            Leave
          </Button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Pool:</span>
          <span
            className="text-xs font-700"
            style={{ color: "oklch(0.85 0.18 80)" }}
          >
            {activeRoom?.totalPool || 0} 🪙 • Winner gets {WIN_REWARD} 🪙
          </span>
        </div>
      </div>

      <h3 className="font-display text-sm font-700 text-muted-foreground uppercase tracking-wider">
        🎯 Make Predictions
      </h3>

      {PREDICTIONS.map((pred, idx) => {
        const state = cardStates[pred.id];
        const selected = cardSelections[pred.id];
        const timeLeft = cardTimers[pred.id];
        const isResolving = state === "resolving";
        const isCorrect = state === "correct";
        const isWrong = state === "wrong";
        const isDone = isCorrect || isWrong;

        return (
          <motion.div
            key={pred.id}
            data-ocid={`friends_room.prediction.card.${idx + 1}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.07 }}
            className="card-glass rounded-2xl p-4"
            style={{
              boxShadow: isCorrect
                ? "0 0 20px oklch(0.62 0.2 140 / 0.4)"
                : isWrong
                  ? "0 0 20px oklch(0.62 0.22 15 / 0.4)"
                  : "none",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{pred.emoji}</span>
                <p className="font-display text-sm font-700 text-foreground">
                  {pred.question}
                </p>
              </div>
              {isResolving && (
                <div
                  className="text-xs font-700 px-2 py-1 rounded-full"
                  style={{
                    background:
                      timeLeft <= 5
                        ? "oklch(0.62 0.22 15 / 0.2)"
                        : "oklch(0.72 0.18 50 / 0.15)",
                    color:
                      timeLeft <= 5
                        ? "oklch(0.75 0.2 15)"
                        : "oklch(0.82 0.18 55)",
                    border: `1px solid ${timeLeft <= 5 ? "oklch(0.62 0.22 15 / 0.4)" : "oklch(0.72 0.18 50 / 0.4)"}`,
                  }}
                >
                  ⏱ {timeLeft}s
                </div>
              )}
              {isDone && (
                <Badge
                  style={{
                    background: isCorrect
                      ? "oklch(0.62 0.2 140 / 0.2)"
                      : "oklch(0.62 0.22 15 / 0.2)",
                    color: isCorrect
                      ? "oklch(0.75 0.18 140)"
                      : "oklch(0.75 0.2 15)",
                    border: "none",
                  }}
                >
                  {isCorrect ? `+${WIN_REWARD} 🪙` : "❌ Lost"}
                </Badge>
              )}
            </div>

            <AnimatePresence mode="wait">
              {state === "idle" && (
                <motion.div
                  key="options"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-2 gap-2"
                >
                  {pred.options.map((opt, oi) => (
                    <button
                      key={opt}
                      type="button"
                      data-ocid={`friends_room.prediction.option.${oi + 1}`}
                      onClick={() => selectPrediction(pred.id, opt)}
                      className="py-3 rounded-xl text-sm font-600 transition-all"
                      style={{
                        background: "oklch(0.2 0.04 255)",
                        border: "1px solid oklch(0.3 0.04 255)",
                        color: "oklch(0.75 0.05 255)",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </motion.div>
              )}
              {(isResolving || isDone) && (
                <motion.div
                  key="status"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-3 rounded-xl text-center"
                  style={{
                    background: isCorrect
                      ? "oklch(0.62 0.2 140 / 0.1)"
                      : isWrong
                        ? "oklch(0.62 0.22 15 / 0.1)"
                        : "oklch(0.72 0.18 50 / 0.08)",
                    border: `1px solid ${isCorrect ? "oklch(0.62 0.2 140 / 0.3)" : isWrong ? "oklch(0.62 0.22 15 / 0.3)" : "oklch(0.72 0.18 50 / 0.2)"}`,
                  }}
                >
                  <p
                    className="text-sm font-700"
                    style={{
                      color: isCorrect
                        ? "oklch(0.75 0.2 140)"
                        : isWrong
                          ? "oklch(0.75 0.2 15)"
                          : "oklch(0.82 0.14 60)",
                    }}
                  >
                    {isResolving
                      ? `⏳ Awaiting... (${selected})`
                      : isCorrect
                        ? `🏆 Correct! +${WIN_REWARD} 🪙`
                        : "❌ Wrong guess"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {leaderboard.length > 0 && (
        <div className="card-glass rounded-2xl p-4">
          <h3 className="font-display text-sm font-700 text-foreground mb-3">
            🏆 Room Leaderboard
          </h3>
          <div className="space-y-2">
            {leaderboard.map((player, i) => (
              <div
                key={player.name}
                data-ocid={`friends_room.leaderboard.item.${i + 1}`}
                className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{
                  background: player.isYou
                    ? "oklch(0.72 0.18 50 / 0.1)"
                    : "oklch(0.18 0.03 255)",
                  border: player.isYou
                    ? "1px solid oklch(0.72 0.18 50 / 0.3)"
                    : "1px solid oklch(0.25 0.04 255)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="font-display font-700 text-sm"
                    style={{
                      color:
                        i === 0 ? "oklch(0.85 0.2 80)" : "oklch(0.55 0.05 255)",
                    }}
                  >
                    #{i + 1}
                  </span>
                  <span className="text-sm font-600 text-foreground">
                    {player.name} {player.isYou ? "(You)" : ""}
                  </span>
                  {i === 0 && (
                    <Badge
                      style={{
                        background: "oklch(0.85 0.2 80 / 0.2)",
                        color: "oklch(0.85 0.2 80)",
                        border: "none",
                        fontSize: "10px",
                      }}
                    >
                      🏆 WINNER
                    </Badge>
                  )}
                </div>
                <span
                  className="font-display font-700 text-sm"
                  style={{ color: "oklch(0.85 0.18 80)" }}
                >
                  {player.score} 🪙
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-center text-muted-foreground mt-3">
            App commission: 10 🪙
          </p>
        </div>
      )}
    </div>
  );
}
