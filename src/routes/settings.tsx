import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Bell, Plus } from "lucide-react";
import { toast } from "sonner";


const KEYS = [
  ["in_app", "In-app notifications", "Show toasts and the notification bell"],
  ["web_push", "Web push", "Browser desktop notifications"],
  ["duels", "Duel results", "Wins and losses"],
  ["challenges", "Challenge invites", "When someone challenges you"],
  ["streaks", "Streak rewards", "Daily streak milestones"],
  ["likes", "Likes", "Likes on your posts"],
  ["comments", "Comments", "Replies to your posts"],
] as const;

type Prefs = Record<string, boolean>;

function SettingsPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [prefs, setPrefs] = useState<Prefs>({});
  const [browserPerm, setBrowserPerm] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof Notification !== "undefined") setBrowserPerm(Notification.permission);
    if (!user) return;
    supabase
      .from("notification_prefs")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPrefs(data as any);
        else {
          const def: any = { user_id: user.id };
          KEYS.forEach(([k]) => (def[k] = true));
          supabase.from("notification_prefs").insert(def).then(() => setPrefs(def));
        }
      });
  }, [user?.id]);

  const toggle = async (key: string) => {
    if (!user) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await supabase.from("notification_prefs").update({ [key]: next[key] } as any).eq("user_id", user.id);
  };

  const askPush = async () => {
    if (typeof Notification === "undefined") return toast.error("Not supported");
    const p = await Notification.requestPermission();
    setBrowserPerm(p);
    if (p === "granted") toast.success("Browser notifications enabled");
  };

  const sendTest = async () => {
    if (!user) return;
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "level_up",
      title: "Test notification",
      body: "If you see this, your settings work ✨",
    });
    toast.success("Test sent");
  };

  return (
    <AppShell
      title={
        <>
          <button onClick={() => nav("/profile")} className="rounded-full glass p-2">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="font-display font-bold">Settings</div>
          <div />
        </>
      }
    >
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notifications</h2>
      <div className="glass rounded-2xl divide-y divide-glass-border">
        {KEYS.map(([k, label, desc]) => (
          <button key={k} onClick={() => toggle(k)} className="flex w-full items-center justify-between p-4 text-left">
            <div className="min-w-0">
              <div className="text-sm font-semibold">{label}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
            <div className={`relative h-6 w-11 rounded-full transition-colors ${prefs[k] ? "gradient-primary" : "bg-secondary"}`}>
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${prefs[k] ? "left-5" : "left-0.5"}`} />
            </div>
          </button>
        ))}
      </div>

      <div className="mt-3 glass rounded-2xl p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Bell className="h-4 w-4" /> Browser permission</div>
        <div className="text-xs text-muted-foreground">Status: <span className="font-bold capitalize">{browserPerm}</span></div>
        {browserPerm !== "granted" && (
          <button onClick={askPush} className="mt-3 rounded-full gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground">
            <Plus className="mr-1 inline h-3 w-3" /> Enable browser push
          </button>
        )}
      </div>

      <button onClick={sendTest} className="mt-4 w-full rounded-2xl glass-strong px-4 py-3 text-sm font-bold">
        Send test notification
      </button>
    </AppShell>
  );
}

export default SettingsPage;
