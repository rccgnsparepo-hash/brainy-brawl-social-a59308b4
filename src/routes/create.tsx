import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { useState } from "react";
import { FileText, Zap, Plus, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

,
});

const types = [
  { id: "text", label: "Post", icon: FileText, color: "text-neon-blue" },
  { id: "challenge", label: "Challenge", icon: Zap, color: "text-xp" },
] as const;

function CreatePage() {
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [type, setType] = useState<(typeof types)[number]["id"]>("text");
  const [content, setContent] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [timer, setTimer] = useState(15);
  const [diff, setDiff] = useState<"easy" | "medium" | "hard">("medium");
  const [busy, setBusy] = useState(false);

  const xpReward = diff === "hard" ? 50 : diff === "medium" ? 30 : 15;

  const submit = async () => {
    if (!user) return;
    if (type === "text" && !content.trim()) return toast.error("Write something");
    if (type === "challenge") {
      if (!question.trim() || !answer.trim()) return toast.error("Question and answer required");
      const opts = options.map((o) => o.trim()).filter(Boolean);
      if (opts.length < 2) return toast.error("At least 2 options");
      if (!opts.includes(answer.trim())) return toast.error("Answer must match one of the options");
    }
    setBusy(true);
    try {
      let challenge_id: string | null = null;
      if (type === "challenge") {
        const { data: ch, error: cErr } = await supabase
          .from("challenges")
          .insert({
            creator_id: user.id,
            question: question.trim(),
            answer: answer.trim(),
            options: options.map((o) => o.trim()).filter(Boolean),
            time_limit: timer,
            reward_xp: xpReward,
            difficulty: diff,
          })
          .select("id")
          .single();
        if (cErr) throw cErr;
        challenge_id = ch.id;
      }
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        type,
        content: content.trim() || (type === "challenge" ? "Solve this 👇" : ""),
        challenge_id,
      });
      if (error) throw error;
      toast.success("Posted!");
      nav("/");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell
      title={
        <>
          <div className="font-display text-lg font-bold">Create</div>
          <button
            onClick={submit}
            disabled={busy || (!content && type === "text") || (type === "challenge" && (!question || !answer))}
            className="rounded-full gradient-primary px-4 py-1.5 text-sm font-bold text-primary-foreground disabled:opacity-40"
          >
            {busy ? "Posting…" : "Post"}
          </button>
        </>
      }
    >
      <div className="no-scrollbar -mx-3 mb-3 flex gap-2 overflow-x-auto px-3">
        {types.map((t) => {
          const Icon = t.icon;
          const active = type === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                active ? "gradient-primary text-primary-foreground glow" : "glass text-muted-foreground"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "" : t.color}`} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-lg">{profile?.avatar ?? "👤"}</div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={type === "challenge" ? "Hype up your challenge…" : "What's on your mind?"}
            rows={3}
            maxLength={500}
            className="flex-1 resize-none bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </div>

        {type === "challenge" && (
          <div className="mt-3 space-y-3 border-t border-glass-border pt-3 animate-fade-in">
            <Field label="Question">
              <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={200} placeholder="e.g. What is 13 × 17?" className="ms-input" />
            </Field>
            <Field label="Correct answer (must match an option)">
              <input value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={100} placeholder="221" className="ms-input" />
            </Field>
            <Field label="Options">
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={opt}
                      onChange={(e) => setOptions(options.map((o, j) => (j === i ? e.target.value : o)))}
                      maxLength={100}
                      placeholder={`Option ${i + 1}`}
                      className="ms-input flex-1"
                    />
                    {options.length > 2 && (
                      <button onClick={() => setOptions(options.filter((_, j) => j !== i))} className="rounded-lg bg-secondary p-2 text-muted-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {options.length < 4 && (
                  <button onClick={() => setOptions([...options, ""])} className="flex items-center gap-1 text-xs text-neon-blue">
                    <Plus className="h-3 w-3" /> Add option
                  </button>
                )}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Timer · ${timer}s`}>
                <input type="range" min={5} max={60} step={5} value={timer} onChange={(e) => setTimer(+e.target.value)} className="w-full accent-[var(--neon-purple)]" />
              </Field>
              <Field label="Difficulty">
                <div className="flex gap-1">
                  {(["easy", "medium", "hard"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDiff(d)}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold uppercase ${diff === d ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-secondary/40 p-3 text-sm">
              <span className="text-muted-foreground">Reward</span>
              <span className="font-display font-bold text-xp">+{xpReward} XP</span>
            </div>
          </div>
        )}
      </div>

      <style>{`.ms-input{background:oklch(1 0 0 / 0.06);border:1px solid var(--glass-border);border-radius:0.75rem;padding:0.625rem 0.75rem;font-size:14px;color:var(--foreground);outline:none;width:100%}.ms-input:focus{border-color:var(--neon-purple)}`}</style>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export default CreatePage;
