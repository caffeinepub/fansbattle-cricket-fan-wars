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

// Seed polls use 0 votes — no fake/random numbers
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

interface Props {
  addCoins: (amount: number, type: string) => Promise<void>;
}

export default function VoteBattle({ addCoins }: Props) {
  const { userId } = useUser();
  const [polls, setPolls] = useState<Poll[]>([]);
  // voted: loaded from Firestore (not localStorage)
  const [voted, setVoted] = useState<Record<string, "A" | "B">>({});
  const [loadingVotes, setLoadingVotes] = useState(false);
  const seededRef = useRef(false);

  // Subscribe to polls
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

        // Seed with 0 votes — no fake counts
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

  // Load user's votes from Firestore when polls are available
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

    // Optimistic UI update
    setVoted((prev) => ({ ...prev, [poll.id]: choice }));

    try {
      // Check + store in Firestore (prevents duplicate votes)
      const stored = await storeVote(userId, poll.id, choice);
      if (!stored) {
        toast.error("Already voted on this poll!");
        // Reload from Firestore to sync state
        const result = await getUserVotesForPolls(userId, [poll.id]);
        setVoted((prev) => ({ ...prev, ...result }));
        return;
      }

      // Increment vote count
      await updateDoc(doc(db, "polls", poll.id), {
        [choice === "A" ? "votesA" : "votesB"]: increment(1),
      });

      await addCoins(3, "vote_reward");
      toast.success("+3 coins earned! 🪙", { duration: 2000 });
    } catch {
      // Revert optimistic update on error
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
            Vote &amp; earn 3 coins per poll
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

      {/* Loading votes from Firestore */}
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
                  className="text-[10px] px-2 py-0.5 rounded-full font-600"
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
                          ? "oklch(0.65 0.22 30 / 0.2)"
                          : "oklch(0.2 0.03 255)",
                        border: isVoted
                          ? "1.5px solid oklch(0.72 0.18 50)"
                          : "1.5px solid oklch(0.25 0.04 255)",
                      }}
                    >
                      <p className="font-600 text-foreground text-xs mb-1">
                        {label}
                      </p>
                      <p
                        className="font-display font-800 text-lg"
                        style={{ color: "oklch(0.72 0.18 50)" }}
                      >
                        {hasVoted ? `${pct}%` : "Vote"}
                      </p>
                      {hasVoted && (
                        <div
                          className="absolute bottom-0 left-0 h-1"
                          style={{
                            width: `${pct}%`,
                            background: "oklch(0.72 0.18 50)",
                            borderRadius: "0 0 4px 4px",
                          }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {hasVoted && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {total.toLocaleString()} votes
                  </p>
                  <button
                    type="button"
                    data-ocid={`vote_battle.share.${idx + 1}`}
                    onClick={() => handleShare(poll)}
                    className="flex items-center gap-1 text-xs px-3 py-1 rounded-full"
                    style={{
                      background: "oklch(0.35 0.1 140 / 0.3)",
                      color: "oklch(0.7 0.16 140)",
                    }}
                  >
                    <Share2 className="h-3 w-3" />
                    Share on WhatsApp
                  </button>
                </div>
              )}

              {!hasVoted && (
                <p
                  className="text-xs text-center"
                  style={{ color: "oklch(0.72 0.18 50)" }}
                >
                  Vote &amp; Earn 3 🪙
                </p>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {polls.length === 0 && (
        <div className="text-center py-16" data-ocid="vote_battle.empty_state">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-muted-foreground">No polls available</p>
        </div>
      )}
    </div>
  );
}
