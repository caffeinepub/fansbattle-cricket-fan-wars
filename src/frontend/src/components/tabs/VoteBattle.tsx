import { Badge } from "@/components/ui/badge";
import { useUser } from "@/context/UserContext";
import { db } from "@/lib/firebase";
import { getUserVotesForPolls, storeVote } from "@/lib/firestore";
import {
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Share2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Poll {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  votesA: number;
  votesB: number;
  enabled: boolean;
}

const DEFAULT_POLLS = [
  {
    question: "Best captain in world cricket right now?",
    optionA: "Attacking Style",
    optionB: "Defensive Style",
  },
  {
    question: "T20 or Test cricket — which is better?",
    optionA: "T20",
    optionB: "Test",
  },
  {
    question: "Who wins a match more — bat or ball?",
    optionA: "Batting",
    optionB: "Bowling",
  },
  { question: "Best format for young fans?", optionA: "T20", optionB: "ODI" },
  {
    question: "Home advantage — does it matter?",
    optionA: "Yes, hugely",
    optionB: "No, skill wins",
  },
];

const VOTE_COST = 2;

interface Props {
  addCoins: (amount: number, type: string) => Promise<void>;
  spendCoins: (amount: number, type: string) => Promise<boolean>;
}

export default function VoteBattle({ spendCoins }: Props) {
  const { userId } = useUser();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [voted, setVoted] = useState<Record<string, "A" | "B">>({});
  const [loadingVotes, setLoadingVotes] = useState(false);
  const seededRef = useRef(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "polls"), orderBy("createdAt", "desc")),
      (snap) => {
        const data: Poll[] = snap.docs
          .map((d) => ({
            id: d.id,
            question: d.data().question || "",
            optionA: d.data().optionA || "",
            optionB: d.data().optionB || "",
            votesA: d.data().votesA || 0,
            votesB: d.data().votesB || 0,
            enabled: d.data().enabled !== false,
          }))
          .filter((p) => p.enabled);
        setPolls(data);

        if (data.length === 0 && !seededRef.current) {
          seededRef.current = true;
          Promise.all(
            DEFAULT_POLLS.map((p) =>
              addDoc(collection(db, "polls"), {
                ...p,
                votesA: 0,
                votesB: 0,
                enabled: true,
                createdAt: serverTimestamp(),
              }),
            ),
          );
        }
      },
    );
    return unsub;
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: polls.length is a proxy for poll list changes
  useEffect(() => {
    if (!userId || polls.length === 0) return;
    setLoadingVotes(true);
    const pollIds = polls.map((p) => p.id);
    getUserVotesForPolls(userId, pollIds)
      .then((result) => setVoted(result))
      .catch(() => {})
      .finally(() => setLoadingVotes(false));
  }, [userId, polls.length]);

  const handleVote = async (poll: Poll, choice: "A" | "B") => {
    if (!userId) return;
    if (voted[poll.id]) {
      toast.error("Already voted on this poll!");
      return;
    }

    // Deduct 2 coins to vote
    const ok = await spendCoins(VOTE_COST, "vote");
    if (!ok) {
      toast.error("Not enough coins to vote! You need 2 🪙");
      return;
    }

    // Optimistic UI update
    setVoted((prev) => ({ ...prev, [poll.id]: choice }));

    try {
      const stored = await storeVote(userId, poll.id, choice);
      if (!stored) {
        toast.error("Already voted on this poll!");
        const result = await getUserVotesForPolls(userId, [poll.id]);
        setVoted((prev) => ({ ...prev, ...result }));
        return;
      }

      await updateDoc(doc(db, "polls", poll.id), {
        [choice === "A" ? "votesA" : "votesB"]: increment(1),
      });

      toast.success("Vote cast! 🗳️", { duration: 2000 });
    } catch {
      setVoted((prev) => {
        const next = { ...prev };
        delete next[poll.id];
        return next;
      });
      toast.error("Vote failed, try again.");
    }
  };

  const handleShare = (poll: Poll) => {
    const choice = voted[poll.id];
    const option = choice === "A" ? poll.optionA : poll.optionB;
    const total = poll.votesA + poll.votesB || 1;
    const pct =
      choice === "A"
        ? Math.round((poll.votesA / total) * 100)
        : Math.round((poll.votesB / total) * 100);
    const text = `🏑 FansBattle Poll: "${poll.question}" - I voted ${option}! ${pct}% fans agree. Play now!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="font-display text-xl font-800 text-foreground">
            🏆 Vote Battle
          </h2>
          <p className="text-muted-foreground text-xs mt-0.5">
            Vote on cricket topics — {VOTE_COST} coins per vote
          </p>
        </div>
        <Badge
          className="text-xs px-2 py-0.5"
          style={{
            background: "oklch(0.55 0.2 145 / 0.2)",
            color: "oklch(0.7 0.18 145)",
          }}
        >
          LIVE
        </Badge>
      </div>

      {loadingVotes && polls.length > 0 && (
        <div className="text-center py-3">
          <p className="text-xs" style={{ color: "oklch(0.55 0.05 255)" }}>
            Loading your votes...
          </p>
        </div>
      )}

      <AnimatePresence>
        {polls.map((poll, idx) => {
          const total = poll.votesA + poll.votesB || 1;
          const pctA = Math.round((poll.votesA / total) * 100);
          const pctB = 100 - pctA;
          const hasVoted = !!voted[poll.id];

          return (
            <motion.div
              key={poll.id}
              data-ocid={`vote_battle.poll.item.${idx + 1}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="card-glass rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="font-display font-700 text-foreground text-sm">
                  {poll.question}
                </p>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-600 shrink-0 ml-2"
                  style={{
                    background: "oklch(0.55 0.2 145 / 0.15)",
                    color: "oklch(0.7 0.18 145)",
                  }}
                >
                  LIVE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(["A", "B"] as const).map((side) => {
                  const label = side === "A" ? poll.optionA : poll.optionB;
                  const pct = side === "A" ? pctA : pctB;
                  const isVoted = voted[poll.id] === side;
                  return (
                    <motion.button
                      key={side}
                      type="button"
                      data-ocid={`vote_battle.poll.option_${side.toLowerCase()}.${idx + 1}`}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleVote(poll, side)}
                      disabled={hasVoted}
                      className="relative overflow-hidden rounded-xl px-3 py-2.5 text-left transition-all"
                      style={{
                        background: isVoted
                          ? "oklch(0.65 0.2 145 / 0.25)"
                          : hasVoted
                            ? "oklch(0.18 0.03 250)"
                            : "oklch(0.22 0.05 250 / 0.6)",
                        border: isVoted
                          ? "1px solid oklch(0.65 0.2 145 / 0.6)"
                          : hasVoted
                            ? "1px solid oklch(0.25 0.04 250)"
                            : "1px solid oklch(0.35 0.07 250 / 0.5)",
                        cursor: hasVoted ? "default" : "pointer",
                      }}
                    >
                      {hasVoted && (
                        <div
                          className="absolute inset-0 rounded-xl"
                          style={{
                            width: `${pct}%`,
                            background: isVoted
                              ? "oklch(0.65 0.2 145 / 0.15)"
                              : "oklch(0.55 0.08 250 / 0.08)",
                            transition: "width 0.5s ease",
                          }}
                        />
                      )}
                      <span className="relative z-10 block">
                        <span className="text-xs font-700 text-foreground">
                          {label}
                        </span>
                        {hasVoted && (
                          <span
                            className="block text-[10px] font-600 mt-0.5"
                            style={{
                              color: isVoted
                                ? "oklch(0.72 0.18 145)"
                                : "oklch(0.6 0.06 250)",
                            }}
                          >
                            {pct}%
                          </span>
                        )}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] font-600"
                  style={{ color: "oklch(0.55 0.06 250)" }}
                >
                  {hasVoted
                    ? `${poll.votesA + poll.votesB} total votes`
                    : `Vote — ${VOTE_COST} 🪙`}
                </span>
                {hasVoted && (
                  <motion.button
                    type="button"
                    data-ocid={`vote_battle.poll.share.${idx + 1}`}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleShare(poll)}
                    className="flex items-center gap-1 text-[10px] font-700 px-2 py-1 rounded-lg transition-colors"
                    style={{
                      background: "oklch(0.22 0.12 145 / 0.3)",
                      color: "oklch(0.72 0.18 145)",
                      border: "1px solid oklch(0.55 0.15 145 / 0.3)",
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Share2 className="w-3 h-3" />
                    Share
                  </motion.button>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {polls.length === 0 && !loadingVotes && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🗳️</p>
          <p className="text-muted-foreground text-sm">Loading polls...</p>
        </div>
      )}
    </div>
  );
}
