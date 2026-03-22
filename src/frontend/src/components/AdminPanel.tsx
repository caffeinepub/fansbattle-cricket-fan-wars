import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/context/UserContext";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface UserRow {
  id: string;
  username: string;
  coins: number;
  role: string;
  createdAt?: string;
}

interface ContestRow {
  id: string;
  matchId: string;
  name: string;
  entryFee: number;
  totalSpots: number;
  joinedUsers: number;
  prizePool: number;
  status: string;
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

type AdminTab = "users" | "contests" | "polls" | "settings";

export default function AdminPanel() {
  const { isAdmin } = useUser();
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [contests, setContests] = useState<ContestRow[]>([]);
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [newPollQ, setNewPollQ] = useState("");
  const [newPollA, setNewPollA] = useState("");
  const [newPollB, setNewPollB] = useState("");
  const [saving, setSaving] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const [rewards, setRewards] = useState({
    dailyReward: 5,
    guessEntry: 10,
    megaEntry: 20,
    adRewardMin: 2,
    adRewardMax: 5,
    commissionPct: 25,
  });

  useEffect(() => {
    if (!isAdmin) return;

    const unsub1 = onSnapshot(query(collection(db, "users")), (snap) => {
      setUsers(
        snap.docs.map((d) => ({
          id: d.id,
          username: d.data().username || "-",
          coins: d.data().coins ?? 0,
          role: d.data().role || "user",
          createdAt:
            d.data().createdAt?.toDate?.()?.toLocaleDateString() || "-",
        })),
      );
    });

    const unsub2 = onSnapshot(
      query(collection(db, "contests"), orderBy("createdAt", "desc")),
      (snap) => {
        setContests(
          snap.docs.map((d) => ({
            id: d.id,
            matchId: d.data().matchId || "-",
            name: d.data().name || "Contest",
            entryFee: d.data().entryFee ?? 0,
            totalSpots: d.data().totalSpots ?? 0,
            joinedUsers: d.data().joinedUsers ?? 0,
            prizePool: d.data().prizePool ?? 0,
            status: d.data().status || "open",
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
    toast.success(poll.enabled ? "Poll disabled" : "Poll enabled");
  };

  const handleLockContest = async (contest: ContestRow) => {
    await updateDoc(doc(db, "contests", contest.id), { status: "locked" });
    toast.success("Contest locked");
  };

  const handleResolveContest = async (contest: ContestRow) => {
    await updateDoc(doc(db, "contests", contest.id), { status: "completed" });
    toast.success("Contest marked as completed");
  };

  const handleSaveRewards = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "config", "rewards"), rewards, { merge: true });
      toast.success("Rewards config saved!");
    } catch {
      toast.error("Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  const handlePromoteAdmin = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { role: "admin" });
      toast.success("User promoted to admin");
    } catch {
      toast.error("Failed to update role");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.id.toLowerCase().includes(userSearch.toLowerCase()),
  );

  const TABS: { id: AdminTab; label: string; icon: string }[] = [
    { id: "users", label: "Users", icon: "👥" },
    { id: "contests", label: "Contests", icon: "🏆" },
    { id: "polls", label: "Polls", icon: "📊" },
    { id: "settings", label: "Config", icon: "⚙️" },
  ];

  const totalCoins = users.reduce((s, u) => s + u.coins, 0);
  const adminUsers = users.filter((u) => u.role === "admin").length;

  return (
    <div className="px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">🛡️</span>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">
            Admin Panel
          </h1>
          <p className="text-xs text-muted-foreground">Control everything</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Users", value: users.length, icon: "👥" },
          { label: "Contests", value: contests.length, icon: "🏆" },
          { label: "Total Coins", value: totalCoins, icon: "🪙" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-3 text-center"
            style={{
              background: "oklch(0.17 0.03 255)",
              border: "1px solid oklch(0.25 0.04 255 / 0.5)",
            }}
          >
            <p className="text-base">{s.icon}</p>
            <p
              className="font-bold text-sm"
              style={{ color: "oklch(0.85 0.18 50)" }}
            >
              {s.value}
            </p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab nav */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            data-ocid={`admin.${t.id}.tab`}
            onClick={() => setActiveTab(t.id)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-semibold transition-all"
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
        <div className="space-y-3">
          <Input
            placeholder="Search by username or ID..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-10"
          />
          <p className="text-xs text-muted-foreground">
            {filteredUsers.length} / {users.length} users · {adminUsers} admins
          </p>
          <div className="space-y-2">
            {filteredUsers.map((u, i) => (
              <div
                key={u.id}
                data-ocid={`admin.users.item.${i + 1}`}
                className="rounded-xl px-4 py-3"
                style={{
                  background: "oklch(0.17 0.03 255)",
                  border: "1px solid oklch(0.25 0.04 255 / 0.5)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground text-sm truncate">
                      {u.username}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {u.id}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Joined: {u.createdAt}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span
                      className="text-xs font-semibold"
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
                    {u.role !== "admin" && (
                      <button
                        type="button"
                        onClick={() => handlePromoteAdmin(u.id)}
                        className="text-[10px] px-2 py-0.5 rounded"
                        style={{
                          background: "oklch(0.55 0.18 30 / 0.2)",
                          color: "oklch(0.75 0.18 50)",
                          border: "1px solid oklch(0.55 0.18 30 / 0.4)",
                        }}
                      >
                        Make Admin
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">
                No users found
              </p>
            )}
          </div>
        </div>
      )}

      {/* Contests */}
      {activeTab === "contests" && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {contests.length} contests total
          </p>
          {contests.map((c, i) => (
            <div
              key={c.id}
              data-ocid={`admin.contests.item.${i + 1}`}
              className="rounded-xl px-4 py-3 space-y-2"
              style={{
                background: "oklch(0.17 0.03 255)",
                border: "1px solid oklch(0.25 0.04 255 / 0.5)",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground text-sm">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Match: {c.matchId}
                  </p>
                </div>
                <Badge
                  style={{
                    background:
                      c.status === "open"
                        ? "oklch(0.55 0.2 145)"
                        : c.status === "locked"
                          ? "oklch(0.55 0.18 50)"
                          : "oklch(0.3 0.05 255)",
                    color: "white",
                    fontSize: "10px",
                  }}
                >
                  {c.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Entry: 🪙{c.entryFee}</span>
                <span>
                  {c.joinedUsers}/{c.totalSpots} players
                </span>
                <span>Prize: 🪙{c.prizePool}</span>
              </div>
              {c.status === "open" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleLockContest(c)}
                    className="flex-1 text-xs py-1.5 rounded-lg font-semibold"
                    style={{
                      background: "oklch(0.55 0.18 50 / 0.2)",
                      color: "oklch(0.75 0.18 50)",
                      border: "1px solid oklch(0.55 0.18 50 / 0.4)",
                    }}
                  >
                    🔒 Lock
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolveContest(c)}
                    className="flex-1 text-xs py-1.5 rounded-lg font-semibold"
                    style={{
                      background: "oklch(0.55 0.2 145 / 0.2)",
                      color: "oklch(0.7 0.2 145)",
                      border: "1px solid oklch(0.55 0.2 145 / 0.4)",
                    }}
                  >
                    ✅ Complete
                  </button>
                </div>
              )}
            </div>
          ))}
          {contests.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">
              No contests yet
            </p>
          )}
        </div>
      )}

      {/* Polls */}
      {activeTab === "polls" && (
        <div className="space-y-4">
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: "oklch(0.17 0.03 255)",
              border: "1px solid oklch(0.25 0.04 255 / 0.5)",
            }}
          >
            <h3 className="font-bold text-foreground text-sm">
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
              className="w-full h-10 font-bold"
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
                className="rounded-xl px-4 py-3"
                style={{
                  background: "oklch(0.17 0.03 255)",
                  border: "1px solid oklch(0.25 0.04 255 / 0.5)",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-foreground text-sm">
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
                    {p.enabled ? "✓ On" : "✗ Off"}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.optionA} ({p.votesA} votes) vs {p.optionB} ({p.votesB}{" "}
                  votes)
                </p>
              </div>
            ))}
            {polls.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">
                No polls yet
              </p>
            )}
          </div>
        </div>
      )}

      {/* Settings */}
      {activeTab === "settings" && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: "oklch(0.17 0.03 255)",
            border: "1px solid oklch(0.25 0.04 255 / 0.5)",
          }}
        >
          <h3 className="font-bold text-foreground text-sm">
            🪙 Economy Config
          </h3>
          {(Object.keys(rewards) as (keyof typeof rewards)[]).map((key) => (
            <div key={key} className="flex items-center gap-3">
              <label
                className="text-xs text-muted-foreground flex-1 capitalize"
                htmlFor={key}
              >
                {key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/Pct$/, " %")
                  .trim()}
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
            className="w-full h-10 font-bold"
            style={{ background: "oklch(0.65 0.22 30)", color: "white" }}
          >
            {saving ? "Saving..." : "Save Config"}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            To become admin: set role="admin" in Firestore users collection
          </p>
        </div>
      )}
    </div>
  );
}
