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
const COMMISSION_PCT = 0.25;
const PAYOUT_PCT = 0.75;

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("room");
    if (code) setJoinCode(code.toUpperCase());
  }, []);

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
          const pool = activeRoom?.totalPool || ENTRY_FEE;
          const winAmount = Math.floor(pool * PAYOUT_PCT);
          const commission = pool - winAmount;
          await addCoins(winAmount, "room_winner", activeRoom?.roomId);
          if (activeRoom?.id) {
            await updateDoc(doc(db, "rooms", activeRoom.id), {
              winner: userId,
              status: "completed",
              commission,
            });
          }
          setLeaderboard((prev) =>
            [...prev]
              .map((p) => (p.isYou ? { ...p, score: p.score + winAmount } : p))
              .sort((a, b) => b.score - a.score),
          );
          toast.success(
            `🏆 Winner! +${winAmount} 🪙 (${Math.round(PAYOUT_PCT * 100)}% of pool)`,
            { duration: 3000 },
          );
          onGameEnd?.();
        } else {
          toast.error("❌ Wrong prediction!", { duration: 2000 });
        }
      }
    }, 1000);

    timerRefs.current[cardId] = interval;
  };

  const pool = activeRoom?.totalPool || ENTRY_FEE;
  const winPreview = Math.floor(pool * PAYOUT_PCT);
  const commissionPreview = pool - winPreview;

  if (view === "lobby") {
    return (
      <div className="px-4 py-6 space-y-5">
        <div>
          <h2 className="font-display text-xl font-800 text-foreground">
            👥 Friends Room
          </h2>
          <p className="text-muted-foreground text-xs mt-0.5">
            Play with friends, top player takes the prize!
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
            className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-11 tracking-widest text-center text-lg font-display"
          />
          <Button
            data-ocid="friends_room.join.button"
            onClick={handleJoin}
            disabled={joinCode.length !== 6}
            className="w-full h-11 font-display font-700"
            style={{
              background:
                joinCode.length === 6
                  ? "linear-gradient(135deg, oklch(0.65 0.2 220), oklch(0.7 0.22 230))"
                  : "oklch(0.22 0.04 255)",
              color: "oklch(0.9 0.02 240)",
            }}
          >
            Join Room — {ENTRY_FEE} 🪙
          </Button>
        </div>

        {/* How it works */}
        <div
          className="rounded-2xl p-4 space-y-2"
          style={{
            background: "oklch(0.16 0.04 255 / 0.6)",
            border: "1px solid oklch(0.28 0.06 255 / 0.5)",
          }}
        >
          <h4
            className="font-display text-sm font-700"
            style={{ color: "oklch(0.75 0.1 255)" }}
          >
            ℹ️ How it works
          </h4>
          <ul
            className="text-xs space-y-1"
            style={{ color: "oklch(0.6 0.07 255)" }}
          >
            <li>• Entry fee: {ENTRY_FEE} coins per player</li>
            <li>
              • Top player wins{" "}
              <strong style={{ color: "oklch(0.82 0.18 90)" }}>
                {Math.round(PAYOUT_PCT * 100)}% of the pool!
              </strong>
            </li>
            <li>• Admin commission: {Math.round(COMMISSION_PCT * 100)}%</li>
            <li>• Invite friends with your room code</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Room header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-800 text-foreground">
            🏠 Room: {activeRoom?.roomId}
          </h3>
          <p className="text-xs" style={{ color: "oklch(0.65 0.08 255)" }}>
            Pool: {pool} 🪙 • Winner gets ~{winPreview} 🪙 • Commission:{" "}
            {commissionPreview} 🪙
          </p>
        </div>
        <Button
          data-ocid="friends_room.leave.button"
          onClick={handleLeave}
          variant="ghost"
          className="text-xs h-8 px-3"
          style={{ color: "oklch(0.65 0.15 15)" }}
        >
          Leave
        </Button>
      </div>

      {/* Players count */}
      <div
        className="flex items-center justify-between px-4 py-2.5 rounded-xl"
        style={{
          background: "oklch(0.18 0.04 250 / 0.6)",
          border: "1px solid oklch(0.3 0.06 250 / 0.4)",
        }}
      >
        <span className="text-xs" style={{ color: "oklch(0.65 0.08 250)" }}>
          👥 {activeRoom?.players.length || 1} player
          {(activeRoom?.players.length || 1) > 1 ? "s" : ""} in room
        </span>
        <button
          type="button"
          data-ocid="friends_room.invite.button"
          onClick={handleInvite}
          className="text-xs font-700 px-3 py-1 rounded-full"
          style={{
            background: "oklch(0.65 0.18 220 / 0.2)",
            color: "oklch(0.75 0.15 220)",
            border: "1px solid oklch(0.55 0.15 220 / 0.4)",
          }}
        >
          📎 Invite
        </button>
      </div>

      {/* Prediction Cards */}
      <div className="grid grid-cols-2 gap-3">
        {PREDICTIONS.map((pred) => {
          const state = cardStates[pred.id];
          const selected = cardSelections[pred.id];
          const timer = cardTimers[pred.id];

          return (
            <motion.div
              key={pred.id}
              data-ocid={`friends_room.prediction.item.${pred.id}`}
              className="rounded-2xl p-3 space-y-2"
              style={{
                background:
                  state === "correct"
                    ? "oklch(0.2 0.1 145)"
                    : state === "wrong"
                      ? "oklch(0.2 0.1 15)"
                      : "oklch(0.17 0.04 250)",
                border:
                  state === "correct"
                    ? "1px solid oklch(0.6 0.2 145 / 0.6)"
                    : state === "wrong"
                      ? "1px solid oklch(0.6 0.2 15 / 0.6)"
                      : "1px solid oklch(0.28 0.06 250 / 0.5)",
              }}
              animate={
                state === "correct"
                  ? { scale: [1, 1.04, 1] }
                  : state === "wrong"
                    ? { x: [-4, 4, -4, 0] }
                    : {}
              }
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xl">{pred.emoji}</span>
                <p className="font-display text-xs font-700 text-foreground">
                  {pred.question}
                </p>
              </div>

              {state === "idle" && (
                <div className="space-y-1.5">
                  {pred.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      data-ocid={`friends_room.prediction.option.${pred.id}`}
                      onClick={() => selectPrediction(pred.id, opt)}
                      className="w-full text-xs font-600 py-2 px-3 rounded-xl text-left transition-colors"
                      style={{
                        background: "oklch(0.22 0.05 250 / 0.6)",
                        border: "1px solid oklch(0.32 0.07 250 / 0.4)",
                        color: "oklch(0.82 0.06 250)",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {(state === "resolving" || state === "selected") && (
                <div className="text-center">
                  <p
                    className="text-xs font-600"
                    style={{ color: "oklch(0.75 0.15 80)" }}
                  >
                    ✓ {selected}
                  </p>
                  <p
                    className="font-display text-2xl font-800 mt-1"
                    style={{ color: "oklch(0.88 0.18 90)" }}
                  >
                    {timer}s
                  </p>
                  <p
                    className="text-[10px] mt-0.5"
                    style={{ color: "oklch(0.55 0.06 250)" }}
                  >
                    resolving...
                  </p>
                </div>
              )}

              {state === "correct" && (
                <div className="text-center">
                  <p
                    className="text-sm font-700"
                    style={{ color: "oklch(0.75 0.2 145)" }}
                  >
                    ✅ Correct!
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "oklch(0.65 0.15 145)" }}
                  >
                    +{winPreview} 🪙
                  </p>
                </div>
              )}

              {state === "wrong" && (
                <div className="text-center">
                  <p
                    className="text-sm font-700"
                    style={{ color: "oklch(0.65 0.2 15)" }}
                  >
                    ❌ Wrong
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Leaderboard */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: "oklch(0.16 0.04 255 / 0.6)",
          border: "1px solid oklch(0.28 0.06 255 / 0.4)",
        }}
      >
        <h4
          className="font-display text-sm font-700 mb-3"
          style={{ color: "oklch(0.75 0.1 255)" }}
        >
          🏅 Leaderboard
        </h4>
        {leaderboard.length === 0 ? (
          <p className="text-xs text-center text-muted-foreground">
            Waiting for players...
          </p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((player, i) => (
              <div
                key={player.name}
                data-ocid={`friends_room.leaderboard.item.${i + 1}`}
                className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{
                  background: player.isYou
                    ? "oklch(0.22 0.07 50 / 0.5)"
                    : "oklch(0.2 0.04 255 / 0.4)",
                  border: player.isYou
                    ? "1px solid oklch(0.55 0.15 50 / 0.4)"
                    : "1px solid oklch(0.28 0.05 255 / 0.3)",
                }}
              >
                <span className="text-xs font-700 text-foreground">
                  #{i + 1} {player.name}
                  {player.isYou && (
                    <Badge
                      className="ml-2 text-[9px] py-0"
                      style={{
                        background: "oklch(0.55 0.18 50 / 0.3)",
                        color: "oklch(0.8 0.15 50)",
                      }}
                    >
                      YOU
                    </Badge>
                  )}
                </span>
                <span
                  className="text-xs font-800"
                  style={{ color: "oklch(0.85 0.18 90)" }}
                >
                  {player.score} 🪙
                </span>
              </div>
            ))}
          </div>
        )}
        <p
          className="text-[10px] text-center mt-3"
          style={{ color: "oklch(0.45 0.05 255)" }}
        >
          Admin commission: {Math.round(COMMISSION_PCT * 100)}% of pool (
          {commissionPreview} 🪙)
        </p>
      </div>
    </div>
  );
}
