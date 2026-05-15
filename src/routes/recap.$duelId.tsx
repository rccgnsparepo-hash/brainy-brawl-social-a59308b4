import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Trophy, Clock, Zap } from "lucide-react";

,
});

function RecapPage() {
  const { duelId } = useParams() as any;
  const { user } = useAuth();
  const nav = useNavigate();
  const [duel, setDuel] = useState<any>(null);
  const [rounds, setRounds] = useState<any[]>([]);
  const [xpEvents, setXpEvents] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: d }, { data: rs }] = await Promise.all([
        supabase.from("duels")
          .select(`*, a:profiles!duels_player_a_fkey(id,handle,display_name,avatar,avatar_url,xp,streak,level), b:profiles!duels_player_b_fkey(id,handle,display_name,avatar,avatar_url,xp,streak,level)`)
          .eq("id", duelId).maybeSingle(),
        supabase.from("duel_rounds").select("*").eq("duel_id", duelId).order("round_number", { ascending: true }),
      ]);
      setDuel(d);
      setRounds(rs ?? []);
      if (user) {
        const { data: xe } = await supabase
          .from("xp_events")
          .select("*")
          .eq("user_id", user.id)
          .gte("created_at", d?.finished_at ?? d?.created_at ?? new Date().toISOString())
          .order("created_at", { ascending: true });
        setXpEvents(xe ?? []);
      }
    })();
  }, [duelId, user?.id]);

  if (!duel) return <div className="p-8 text-center text-muted-foreground">Loading recap…</div>;

  const isA = user?.id === duel.player_a;
  const me = isA ? duel.a : duel.b;
  const opp = isA ? duel.b : duel.a;
  const myScore = isA ? duel.score_a : duel.score_b;
  const oppScore = isA ? duel.score_b : duel.score_a;
  const won = duel.winner_id === user?.id;
  const draw = !duel.winner_id;
  const xpGain = xpEvents.reduce((s, e) => s + (e.amount ?? 0), 0);

  return (
    <AppShell
      title={
        <>
          <button onClick={() => nav("/arena")} className="rounded-full glass p-2"><ArrowLeft className="h-4 w-4" /></button>
          <div className="font-display font-bold">Recap</div>
          <div className="w-8" />
        </>
      }
    >
      <div className="glass-strong rounded-3xl p-6 text-center">
        <Trophy className={`mx-auto h-14 w-14 ${won ? "text-xp" : draw ? "text-muted-foreground" : "text-destructive"}`} />
        <div className="mt-2 font-display text-3xl font-bold">{draw ? "Draw" : won ? "Victory!" : "Defeat"}</div>
        <div className="mt-1 flex items-center justify-center gap-3 text-lg">
          <span className="font-display font-bold">{me?.display_name?.split(" ")[0] ?? "You"} {myScore}</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-display font-bold">{oppScore} {opp?.display_name?.split(" ")[0] ?? "Opp"}</span>
        </div>
        {xpGain > 0 && (
          <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-xp/15 px-3 py-1 text-sm font-bold text-xp">
            <Zap className="h-3 w-3" /> +{xpGain} XP
          </div>
        )}
      </div>

      <h2 className="mt-5 mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Round-by-round</h2>
      <div className="space-y-2">
        {rounds.map((r) => {
          const aTime = r.answered_at_a ? new Date(r.answered_at_a).getTime() - new Date(r.created_at).getTime() : null;
          const bTime = r.answered_at_b ? new Date(r.answered_at_b).getTime() - new Date(r.created_at).getTime() : null;
          const myTime = isA ? aTime : bTime;
          const oppTime = isA ? bTime : aTime;
          const myCorrect = (isA ? r.answer_a : r.answer_b) === r.answer;
          const oppCorrect = (isA ? r.answer_b : r.answer_a) === r.answer;
          const winnerLabel = !r.winner ? "—" : r.winner === user?.id ? "You" : opp?.display_name ?? "Opp";
          return (
            <div key={r.id} className="glass rounded-2xl p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold uppercase">R{r.round_number}</span>
                <span className="font-bold text-xp">⚡ {winnerLabel}</span>
              </div>
              <p className="mt-2 text-sm font-medium">{r.question}</p>
              <div className="mt-1 text-xs text-muted-foreground">Answer: <span className="text-success">{r.answer}</span></div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <RoundSide label="You" correct={myCorrect} ans={isA ? r.answer_a : r.answer_b} ms={myTime} />
                <RoundSide label={opp?.display_name?.split(" ")[0] ?? "Opp"} correct={oppCorrect} ans={isA ? r.answer_b : r.answer_a} ms={oppTime} />
              </div>
            </div>
          );
        })}
        {rounds.length === 0 && <div className="text-center text-sm text-muted-foreground">No rounds recorded.</div>}
      </div>

      <button onClick={() => nav("/arena")} className="mt-5 w-full rounded-full gradient-primary py-3 text-sm font-bold text-primary-foreground">
        Back to Arena
      </button>
    </AppShell>
  );
}

function RoundSide({ label, correct, ans, ms }: { label: string; correct: boolean; ans: string | null; ms: number | null }) {
  return (
    <div className={`rounded-xl p-2 ${correct ? "bg-success/10 border border-success/30" : "bg-secondary/40"}`}>
      <div className="flex items-center justify-between">
        <span className="font-semibold">{label}</span>
        {ms != null && <span className="flex items-center gap-0.5 text-muted-foreground"><Clock className="h-3 w-3" />{(ms / 1000).toFixed(1)}s</span>}
      </div>
      <div className={`truncate ${correct ? "text-success" : ans ? "text-destructive" : "text-muted-foreground"}`}>{ans ?? "no answer"}</div>
    </div>
  );
}

export default RecapPage;
