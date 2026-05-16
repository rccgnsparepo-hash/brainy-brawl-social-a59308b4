import { useState } from "react";
import { Clock, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export function ChallengeAttempt({ challenge, compact = false }: { challenge: any; compact?: boolean }) {
  const { user } = useAuth();
  const [solved, setSolved] = useState<null | "right" | "wrong">(null);
  const [reward, setReward] = useState(0);

  const answer = async (opt: string) => {
    if (!user || solved) return;
    const { data, error } = await supabase.rpc("solve_challenge", { _challenge_id: challenge.id, _answer: opt, _time_taken_ms: 0 });
    if (error) return toast.error(error.message);
    const result = data as { correct: boolean; reward: number };
    setSolved(result.correct ? "right" : "wrong");
    setReward(result.reward ?? 0);
  };

  return (
    <div className={`glass-strong rounded-xl ${compact ? "p-3" : "p-4"}`}>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-semibold uppercase">
          <Zap className="h-3 w-3 text-xp" /> {challenge.is_daily ? "Daily" : "Challenge"}
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-3 w-3" /> {challenge.time_limit}s <b className="text-xp">+{challenge.reward_xp} XP</b>
        </span>
      </div>
      <p className={`${compact ? "line-clamp-2" : ""} mb-3 text-sm font-semibold`}>{challenge.question}</p>
      {!solved ? (
        <div className="grid grid-cols-2 gap-2">
          {(challenge.options ?? []).map((opt: string) => (
            <button key={opt} onClick={() => answer(opt)} className="rounded-lg border border-glass-border bg-secondary/40 px-3 py-2 text-sm transition hover:border-neon-purple">
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <div className={`rounded-lg p-3 text-center text-sm font-bold ${solved === "right" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
          {solved === "right" ? (reward ? `Correct! +${reward} XP` : "Correct — already solved") : `Not quite — ${challenge.answer}`}
        </div>
      )}
    </div>
  );
}