import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

,
});

const AVATARS = ["🦊", "🦉", "🐺", "🦁", "🐯", "🐻", "🦅", "🐉", "🦄", "🐙"];
const GRADES = ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"];

function SignupPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState(GRADES[2]);
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");

  useEffect(() => {
    if (user) nav("/");
  }, [user, nav]);

  const submit = async () => {
    if (!email || !password || !handle || !displayName || !school) {
      toast.error("Fill in email, handle, name, and school");
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/i.test(handle)) {
      toast.error("Handle must be 3-20 chars, letters/numbers/underscore");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          handle: handle.toLowerCase(),
          display_name: displayName.trim(),
          school: school.trim(),
          grade,
          avatar,
          bio: bio.trim() || null,
          instagram: instagram.trim() || null,
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome to MindSprint!");
    nav("/");
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-8">
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-primary glow">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <div className="font-display text-xl font-bold leading-tight">Join MindSprint</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Step {step} of 2</div>
        </div>
      </div>

      <div className="glass space-y-3 rounded-2xl p-5">
        {step === 1 && (
          <>
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="ms-input" placeholder="you@school.edu" />
            </Field>
            <Field label="Password (6+ chars)">
              <input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="ms-input" />
            </Field>
            <Field label="Handle">
              <div className="flex items-center rounded-xl border border-glass-border bg-white/5 pl-3">
                <span className="text-muted-foreground">@</span>
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  maxLength={20}
                  className="ms-input border-0 bg-transparent pl-1"
                  placeholder="alexrivers"
                />
              </div>
            </Field>
            <Field label="Display name">
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} className="ms-input" placeholder="Alex Rivers" />
            </Field>
            <button
              onClick={() => {
                if (!email || !password || !handle || !displayName) {
                  toast.error("Fill all fields to continue");
                  return;
                }
                setStep(2);
              }}
              className="w-full rounded-xl gradient-primary px-4 py-3 font-bold text-primary-foreground glow"
            >
              Continue
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="School">
              <input value={school} onChange={(e) => setSchool(e.target.value)} maxLength={80} className="ms-input" placeholder="Northridge High" />
            </Field>
            <Field label="Grade / Year">
              <div className="grid grid-cols-4 gap-1.5">
                {GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrade(g)}
                    className={`rounded-lg px-2 py-1.5 text-xs font-semibold ${grade === g ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                  >
                    {g.replace("Year ", "Y")}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Pick an avatar">
              <div className="grid grid-cols-5 gap-1.5">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    className={`flex h-11 items-center justify-center rounded-xl text-2xl transition-all ${avatar === a ? "gradient-primary glow" : "bg-secondary"}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Bio (optional)">
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} rows={2} className="ms-input resize-none" placeholder="Logic puzzles & late-night essays" />
            </Field>
            <Field label="Instagram (optional)">
              <input value={instagram} onChange={(e) => setInstagram(e.target.value.replace(/^@/, ""))} maxLength={30} className="ms-input" placeholder="yourhandle" />
            </Field>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-muted-foreground">
                Back
              </button>
              <button onClick={submit} disabled={busy} className="flex-1 rounded-xl gradient-primary px-4 py-3 font-bold text-primary-foreground glow disabled:opacity-50">
                {busy ? "Creating…" : "Create account"}
              </button>
            </div>
          </>
        )}
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-neon-blue">
          Sign in
        </Link>
      </p>

      <style>{`.ms-input{background:oklch(1 0 0 / 0.06);border:1px solid var(--glass-border);border-radius:0.75rem;padding:0.75rem 0.875rem;font-size:14px;color:var(--foreground);outline:none;width:100%}.ms-input:focus{border-color:var(--neon-purple)}`}</style>
    </div>
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

export default SignupPage;
