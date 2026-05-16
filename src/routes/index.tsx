import { AppShell } from "@/components/app-shell";
import { PostCard } from "@/components/post-card";
import { Flame, Sparkles, Image as ImageIcon, Crown } from "lucide-react";
import { useAuth, levelProgress } from "@/lib/auth";
import { useEffect, useState } from "react";
import { fetchFeed } from "@/lib/feed";
import type { FeedPost } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { NotificationsBell } from "@/components/notifications-bell";
import { ChallengeAttempt } from "@/components/challenge-attempt";


function HomePage() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [daily, setDaily] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    try {
      await supabase.rpc("create_daily_challenges", { _count: 3 });
      const [{ data: dailyRows }, data] = await Promise.all([
        supabase.from("challenges").select("*").eq("is_daily", true).order("created_at", { ascending: false }).limit(3),
        fetchFeed(user.id),
      ]);
      setDaily(dailyRows ?? []);
      setPosts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  // Realtime: any new post or count change triggers a refetch
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts" }, (payload) => {
        setPosts((prev) => prev.map((p) => (p.id === (payload.new as any).id ? { ...p, ...(payload.new as any) } : p)));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  const lvl = profile ? levelProgress(profile.xp, profile.level) : { cur: 0, next: 50, pct: 0 };

  return (
    <AppShell
      title={
        <>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-base">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-display text-base font-bold leading-tight">MindSprint</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Social</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {profile && (
              <div className="flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs">
                <Flame className="h-3.5 w-3.5 text-neon-pink" />
                <span className="font-semibold">{profile.streak}</span>
              </div>
            )}
            <NotificationsBell />
          </div>
        </>
      }
    >
      <div className="-mx-3 border-b border-glass-border bg-card/70 px-3 pb-3 pt-2">
        <div className="flex items-center gap-7 text-sm font-bold text-muted-foreground">
          <span className="text-foreground">Following</span>
          <span className="border-b-2 border-foreground pb-3 text-foreground">Trending</span>
          <span>Schools</span>
        </div>
      </div>

      {profile && (
        <div className="-mx-3 flex items-center gap-3 border-b border-glass-border bg-card/70 px-3 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full gradient-primary text-xl">{profile.avatar}</div>
          <div className="flex-1 text-muted-foreground">What's new?</div>
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
          <Sparkles className="h-5 w-5 text-neon-purple" />
        </div>
      )}

      {daily.length > 0 && (
        <section className="-mx-3 border-b border-glass-border bg-card/70 p-3">
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold"><Crown className="h-5 w-5 text-xp" /> Daily XP</h2>
          <div className="no-scrollbar flex gap-3 overflow-x-auto">
            {daily.map((c) => <div key={c.id} className="w-[82%] shrink-0"><ChallengeAttempt challenge={c} compact /></div>)}
          </div>
        </section>
      )}

      <div className="-mx-3 space-y-3 bg-background pt-3">
        {loading && <div className="text-center text-sm text-muted-foreground">Loading feed…</div>}
        {!loading && posts.length === 0 && (
          <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
            Feed is empty. Be the first to post a challenge!
          </div>
        )}
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
    </AppShell>
  );
}

export default HomePage;
