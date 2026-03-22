import type { ApiMatch } from "@/components/tabs/HomeTab";
import { useUser } from "@/context/UserContext";
import {
  type Contest,
  type ContestEntry,
  getContestEntry,
  submitContestAnswers,
} from "@/lib/firestore";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Props {
  match: ApiMatch;
  contest: Contest;
  onBack: () => void;
}

export default function ContestQuestionScreen({
  match,
  contest,
  onBack,
}: Props) {
  const { deviceId } = useUser();
  const [entry, setEntry] = useState<ContestEntry | null | undefined>(
    undefined,
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const team1 = match.teams?.[0] ?? "Team A";
  const team2 = match.teams?.[1] ?? "Team B";

  useEffect(() => {
    if (!deviceId) return;
    getContestEntry(deviceId, contest.id).then((e) => {
      setEntry(e);
      if (e?.submitted) setSubmitted(true);
    });
  }, [deviceId, contest.id]);

  const handleSelect = (questionId: string, option: string) => {
    if (submitted || entry?.submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const allAnswered = contest.questions.every((q) => answers[q.id]);

  const handleSubmit = async () => {
    if (!deviceId || !allAnswered) return;
    setSubmitting(true);
    const result = await submitContestAnswers(
      deviceId,
      contest.id,
      match.id,
      answers,
    );
    setSubmitting(false);
    if (result.success) {
      setSubmitted(true);
      toast.success("Answers submitted! 🎉");
    } else if (result.error === "ALREADY_SUBMITTED") {
      setSubmitted(true);
      toast.info("Already submitted.");
    } else {
      toast.error("Failed to submit. Try again.");
    }
  };

  const isLoading = entry === undefined;
  const existingAnswers = entry?.answers ?? {};
  const displayAnswers = submitted ? (entry?.answers ?? answers) : answers;

  return (
    <div
      data-ocid="contest_questions.page"
      className="app-shell flex flex-col"
      style={{ background: "oklch(0.11 0.02 255)", minHeight: "100dvh" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 h-16 shrink-0"
        style={{
          borderBottom: "1px solid oklch(0.25 0.04 255 / 0.4)",
          background: "oklch(0.13 0.025 255 / 0.98)",
        }}
      >
        <button
          type="button"
          data-ocid="contest_questions.back.button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold transition-colors"
          style={{ color: "oklch(0.65 0.18 220)" }}
        >
          <span className="text-base">←</span>
          <span>Back</span>
        </button>
        <div className="flex-1 text-center min-w-0">
          <p className="font-display font-bold text-foreground text-sm truncate">
            {contest.name}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {team1} vs {team2}
          </p>
        </div>
        <div className="w-14" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Match info */}
        <div
          className="rounded-2xl p-3 flex items-center justify-between"
          style={{
            background: "oklch(0.17 0.03 255)",
            border: "1px solid oklch(0.28 0.05 255 / 0.4)",
          }}
        >
          <div className="text-center flex-1">
            <p className="font-display font-bold text-foreground text-sm">
              {team1}
            </p>
          </div>
          <span
            className="text-xs font-bold px-3"
            style={{ color: "oklch(0.55 0.08 255)" }}
          >
            VS
          </span>
          <div className="text-center flex-1">
            <p className="font-display font-bold text-foreground text-sm">
              {team2}
            </p>
          </div>
        </div>

        {/* Entry fee + prize */}
        <div className="flex gap-3">
          <div
            className="flex-1 rounded-xl p-3 text-center"
            style={{
              background: "oklch(0.2 0.05 80 / 0.2)",
              border: "1px solid oklch(0.65 0.15 80 / 0.3)",
            }}
          >
            <p className="text-xs text-muted-foreground">Entry</p>
            <p
              className="font-display font-bold"
              style={{ color: "oklch(0.85 0.18 80)" }}
            >
              🪙 {contest.entryFee}
            </p>
          </div>
          <div
            className="flex-1 rounded-xl p-3 text-center"
            style={{
              background: "oklch(0.2 0.05 150 / 0.2)",
              border: "1px solid oklch(0.55 0.2 150 / 0.3)",
            }}
          >
            <p className="text-xs text-muted-foreground">Prize Pool</p>
            <p
              className="font-display font-bold"
              style={{ color: "oklch(0.65 0.2 150)" }}
            >
              🏆 {contest.prizePool}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div
            data-ocid="contest_questions.loading_state"
            className="flex flex-col items-center justify-center py-12"
          >
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mb-4"
              style={{ borderColor: "oklch(0.65 0.18 220)" }}
            />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : submitted ? (
          /* Submitted state */
          <motion.div
            data-ocid="contest_questions.success_state"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-6 text-center space-y-4"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.2 0.08 150), oklch(0.15 0.05 255))",
              border: "1px solid oklch(0.55 0.2 150 / 0.4)",
            }}
          >
            <p className="text-4xl">🎉</p>
            <p className="font-display font-bold text-foreground text-lg">
              Answers Submitted!
            </p>
            <p className="text-sm text-muted-foreground">
              Awaiting match results. Winners will be announced after the match.
            </p>

            {/* Summary */}
            <div className="space-y-2 text-left mt-4">
              {contest.questions.map((q) => (
                <div
                  key={q.id}
                  className="rounded-xl p-3"
                  style={{
                    background: "oklch(0.17 0.03 255)",
                    border: "1px solid oklch(0.28 0.05 255 / 0.4)",
                  }}
                >
                  <p className="text-xs text-muted-foreground mb-1">{q.text}</p>
                  <p
                    className="text-sm font-display font-bold"
                    style={{ color: "oklch(0.65 0.2 150)" }}
                  >
                    ✓ {displayAnswers[q.id] ?? existingAnswers[q.id] ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          /* Questions */
          <AnimatePresence>
            <div className="space-y-4">
              {contest.questions.map((q, qi) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: qi * 0.08 }}
                  className="rounded-2xl p-4 space-y-3"
                  style={{
                    background: "oklch(0.17 0.03 255)",
                    border: "1px solid oklch(0.28 0.05 255 / 0.4)",
                  }}
                >
                  <p className="font-display font-bold text-foreground text-sm">
                    Q{qi + 1}: {q.text}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((option) => {
                      const isSelected = answers[q.id] === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          data-ocid="contest_questions.option.button"
                          onClick={() => handleSelect(q.id, option)}
                          className="py-3 px-3 rounded-xl text-sm font-semibold transition-all text-left"
                          style={{
                            background: isSelected
                              ? "oklch(0.65 0.18 220 / 0.25)"
                              : "oklch(0.22 0.04 255)",
                            border: `1px solid ${
                              isSelected
                                ? "oklch(0.65 0.18 220 / 0.8)"
                                : "oklch(0.3 0.04 255 / 0.4)"
                            }`,
                            color: isSelected
                              ? "oklch(0.82 0.12 220)"
                              : "oklch(0.75 0.06 255)",
                            transform: isSelected ? "scale(1.02)" : "scale(1)",
                          }}
                        >
                          {isSelected && <span className="mr-1.5">✓</span>}
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Submit button */}
      {!submitted && !isLoading && (
        <div
          className="px-4 pb-6 pt-3 shrink-0"
          style={{ borderTop: "1px solid oklch(0.22 0.04 255 / 0.5)" }}
        >
          <button
            type="button"
            data-ocid="contest_questions.submit.button"
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="w-full py-4 rounded-2xl font-display font-bold text-base transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: allAnswered
                ? "linear-gradient(135deg, oklch(0.65 0.18 220), oklch(0.72 0.2 230))"
                : "oklch(0.22 0.04 255)",
              color: allAnswered ? "white" : "oklch(0.5 0.05 255)",
            }}
          >
            {submitting ? "Submitting..." : "Submit Answers"}
          </button>
          {!allAnswered && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              Answer all questions to submit
            </p>
          )}
        </div>
      )}
    </div>
  );
}
