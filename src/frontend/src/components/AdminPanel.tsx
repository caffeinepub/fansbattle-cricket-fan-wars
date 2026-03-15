import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/context/UserContext";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface UserRow {
  id: string;
  username: string;
  phone: string;
  coins: number;
  level: number;
  role: string;
}

interface RoomRow {
  id: string;
  roomId: string;
  status: string;
  totalPool: number;
  players: string[];
}

interface PollRow {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  votesA: number;
  votesB: number;
  enabled: boolean;
}

type AdminTab = "users" | "rooms" | "polls" | "settings";

export default function AdminPanel() {
  const { isAdmin } = useUser();
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [newPollQ, setNewPollQ] = useState("");
  const [newPollA, setNewPollA] = useState("");
  const [newPollB, setNewPollB] = useState("");
  const [saving, setSaving] = useState(false);

  // Rewards config
  const [rewards, setRewards] = useState({
    guessEntry: 10,
    correctGuess: 25,
    voteReward: 3,
    roomEntry: 20,
    roomWinner: 70,
    adReward: 20,
  });

  useEffect(() => {
    if (!isAdmin) return;
    const unsub1 = onSnapshot(query(collection(db, "users")), (snap) => {
      setUsers(
        snap.docs.map((d) => ({
          id: d.id,
          username: d.data().username || "-",
          phone: d.data().phone || "-",
          coins: d.data().coins || 0,
          level: d.data().level || 1,
          role: d.data().role || "user",
        })),
      );
    });
    const unsub2 = onSnapshot(
      query(collection(db, "rooms"), orderBy("createdAt", "desc")),
      (snap) => {
        setRooms(
          snap.docs.map((d) => ({
            id: d.id,
            roomId: d.data().roomId || d.id,
            status: d.data().status || "unknown",
            totalPool: d.data().totalPool || 0,
            players: d.data().players || [],
          })),
        );
      },
    );
    const unsub3 = onSnapshot(query(collection(db, "polls")), (snap) => {
      setPolls(
        snap.docs.map((d) => ({
          id: d.id,
          question: d.data().question || "",
          optionA: d.data().optionA || "",
          optionB: d.data().optionB || "",
          votesA: d.data().votesA || 0,
          votesB: d.data().votesB || 0,
          enabled: d.data().enabled !== false,
        })),
      );
    });
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied.</p>
      </div>
    );
  }

  const handleCreatePoll = async () => {
    if (!newPollQ || !newPollA || !newPollB) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "polls"), {
        question: newPollQ,
        optionA: newPollA,
        optionB: newPollB,
        votesA: 0,
        votesB: 0,
        enabled: true,
      });
      setNewPollQ("");
      setNewPollA("");
      setNewPollB("");
      toast.success("Poll created!");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePoll = async (poll: PollRow) => {
    await updateDoc(doc(db, "polls", poll.id), { enabled: !poll.enabled });
  };

  const handleSaveRewards = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "config", "rewards"), rewards);
      toast.success("Rewards config saved!");
    } catch {
      // doc may not exist yet
      await addDoc(collection(db, "config"), { ...rewards, id: "rewards" });
      toast.success("Rewards config created!");
    } finally {
      setSaving(false);
    }
  };

  const TABS: { id: AdminTab; label: string; icon: string }[] = [
    { id: "users", label: "Users", icon: "👥" },
    { id: "rooms", label: "Rooms", icon: "🏠" },
    { id: "polls", label: "Polls", icon: "📊" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">🛡️</span>
        <div>
          <h1 className="font-display text-xl font-800 text-foreground">
            Admin Panel
          </h1>
          <p className="text-xs text-muted-foreground">Control everything</p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            data-ocid={`admin.${t.id}.tab`}
            onClick={() => setActiveTab(t.id)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-600 transition-all"
            style={{
              background:
                activeTab === t.id
                  ? "oklch(0.65 0.22 30 / 0.2)"
                  : "oklch(0.2 0.03 255)",
              border:
                activeTab === t.id
                  ? "1px solid oklch(0.65 0.22 30)"
                  : "1px solid oklch(0.25 0.04 255)",
              color:
                activeTab === t.id
                  ? "oklch(0.85 0.18 50)"
                  : "oklch(0.55 0.04 255)",
            }}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Users */}
      {activeTab === "users" && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {users.length} users registered
          </p>
          {users.map((u, i) => (
            <div
              key={u.id}
              data-ocid={`admin.users.item.${i + 1}`}
              className="card-glass rounded-xl px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="font-display font-700 text-foreground text-sm">
                  {u.username}
                </p>
                <p className="text-xs text-muted-foreground">{u.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-600"
                  style={{ color: "oklch(0.85 0.18 80)" }}
                >
                  🪙 {u.coins}
                </span>
                <Badge
                  style={{
                    background:
                      u.role === "admin"
                        ? "oklch(0.65 0.22 30)"
                        : "oklch(0.3 0.05 255)",
                    color: "white",
                    fontSize: "10px",
                  }}
                >
                  {u.role}
                </Badge>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <p
              className="text-center text-muted-foreground text-sm py-8"
              data-ocid="admin.users.empty_state"
            >
              No users yet
            </p>
          )}
        </div>
      )}

      {/* Rooms */}
      {activeTab === "rooms" && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {rooms.length} rooms created
          </p>
          {rooms.map((r, i) => (
            <div
              key={r.id}
              data-ocid={`admin.rooms.item.${i + 1}`}
              className="card-glass rounded-xl px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="font-display font-700 text-foreground text-sm">
                  🏠 {r.roomId}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.players.length} players
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs"
                  style={{ color: "oklch(0.85 0.18 80)" }}
                >
                  ₹{r.totalPool}
                </span>
                <Badge
                  style={{
                    background:
                      r.status === "active"
                        ? "oklch(0.55 0.2 145)"
                        : "oklch(0.3 0.05 255)",
                    color: "white",
                    fontSize: "10px",
                  }}
                >
                  {r.status}
                </Badge>
              </div>
            </div>
          ))}
          {rooms.length === 0 && (
            <p
              className="text-center text-muted-foreground text-sm py-8"
              data-ocid="admin.rooms.empty_state"
            >
              No rooms yet
            </p>
          )}
        </div>
      )}

      {/* Polls */}
      {activeTab === "polls" && (
        <div className="space-y-4">
          <div className="card-glass rounded-xl p-4 space-y-3">
            <h3 className="font-display font-700 text-foreground text-sm">
              ➕ Create Poll
            </h3>
            <Input
              data-ocid="admin.polls.question_input"
              placeholder="Poll question"
              value={newPollQ}
              onChange={(e) => setNewPollQ(e.target.value)}
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-10"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                data-ocid="admin.polls.option_a_input"
                placeholder="Option A"
                value={newPollA}
                onChange={(e) => setNewPollA(e.target.value)}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-10"
              />
              <Input
                data-ocid="admin.polls.option_b_input"
                placeholder="Option B"
                value={newPollB}
                onChange={(e) => setNewPollB(e.target.value)}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-10"
              />
            </div>
            <Button
              data-ocid="admin.polls.create_button"
              onClick={handleCreatePoll}
              disabled={!newPollQ || !newPollA || !newPollB || saving}
              className="w-full h-10 font-700"
              style={{ background: "oklch(0.65 0.22 30)", color: "white" }}
            >
              {saving ? "Creating..." : "Create Poll"}
            </Button>
          </div>

          <div className="space-y-2">
            {polls.map((p, i) => (
              <div
                key={p.id}
                data-ocid={`admin.polls.item.${i + 1}`}
                className="card-glass rounded-xl px-4 py-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-600 text-foreground text-sm">
                    {p.question}
                  </p>
                  <button
                    type="button"
                    data-ocid={`admin.polls.toggle.${i + 1}`}
                    onClick={() => handleTogglePoll(p)}
                    className="text-xs px-2 py-1 rounded"
                    style={{
                      background: p.enabled
                        ? "oklch(0.55 0.2 145 / 0.2)"
                        : "oklch(0.5 0.18 25 / 0.2)",
                      color: p.enabled
                        ? "oklch(0.7 0.18 145)"
                        : "oklch(0.65 0.18 25)",
                    }}
                  >
                    {p.enabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.optionA} ({p.votesA}) vs {p.optionB} ({p.votesB})
                </p>
              </div>
            ))}
            {polls.length === 0 && (
              <p
                className="text-center text-muted-foreground text-sm py-4"
                data-ocid="admin.polls.empty_state"
              >
                No polls yet
              </p>
            )}
          </div>
        </div>
      )}

      {/* Settings */}
      {activeTab === "settings" && (
        <div className="card-glass rounded-xl p-4 space-y-3">
          <h3 className="font-display font-700 text-foreground text-sm">
            🪙 Coin Rewards Config
          </h3>
          {(Object.keys(rewards) as (keyof typeof rewards)[]).map((key) => (
            <div key={key} className="flex items-center gap-3">
              <label
                className="text-xs text-muted-foreground capitalize flex-1"
                htmlFor={key}
              >
                {key.replace(/([A-Z])/g, " $1").trim()}
              </label>
              <Input
                id={key}
                data-ocid={`admin.settings.${key}_input`}
                type="number"
                value={rewards[key]}
                onChange={(e) =>
                  setRewards((prev) => ({
                    ...prev,
                    [key]: Number(e.target.value),
                  }))
                }
                className="w-24 bg-secondary border-border text-foreground h-9 text-center"
              />
            </div>
          ))}
          <Button
            data-ocid="admin.settings.save_button"
            onClick={handleSaveRewards}
            disabled={saving}
            className="w-full h-10 font-700"
            style={{ background: "oklch(0.65 0.22 30)", color: "white" }}
          >
            {saving ? "Saving..." : "Save Config"}
          </Button>
        </div>
      )}
    </div>
  );
}
