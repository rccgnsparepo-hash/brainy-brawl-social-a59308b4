import { Link, useParams } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { Flame, LogOut, Instagram, Settings, Plus, Grid3x3, Zap, Swords, Trophy, Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth, levelProgress } from "@/lib/auth";
import { fetchUserPosts } from "@/lib/feed";
import type { FeedPost } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { PostCard } from "@/components/post-card";
import { uploadAvatar } from "@/lib/upload";
import { toast } from "sonner";


function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [rank, setRank] = useState<number | null>(null);
  const [tab, setTab] = useState<"grid" | "feed">("grid");
  const [openPost, setOpenPost] = useState<FeedPost | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchUserPosts(user.id).then(setPosts);
    supabase
      .from("profiles")
      .select("id, xp")
      .order("xp", { ascending: false })
      .then(({ data }) => {
        const idx = (data ?? []).findIndex((p: any) => p.id === user.id);
        setRank(idx >= 0 ? idx + 1 : null);
      });
  }, [user?.id, profile?.xp]);

  if (!profile) return null;

  const winRate = profile.wins + profile.losses > 0 ? Math.round((profile.wins / (profile.wins + profile.losses)) * 100) : 0;
  const lvl = levelProgress(profile.xp, profile.level);
  const badges = computeBadges(profile);

  return (
    <AppShell
      title={
        <>
          <div className="flex items-center gap-1.5">
            <div className="font-display text-lg font-bold">@{profile.handle}</div>
            <span className="rounded-full bg-neon-blue/20 p-0.5 text-neon-blue">✓</span>
          </div>
          <div className="flex gap-1">
            <Link to="/create" className="rounded-full glass p-2" aria-label="Create"><Plus className="h-4 w-4" /></Link>
            <Link to="/settings" className="rounded-full glass p-2" aria-label="Settings"><Settings className="h-4 w-4" /></Link>
            <button onClick={signOut} className="rounded-full glass p-2" aria-label="Sign out"><LogOut className="h-4 w-4" /></button>
          </div>
        </>
      }
    >
      {/* Instagram-style header */}
      <div className="flex items-start gap-5 px-1">
        <div className="relative shrink-0">
          <div className="rounded-full p-[2px] gradient-hot">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-background text-4xl">{profile.avatar}</div>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-1 text-center">
          <Stat n={posts.length} label="posts" />
          <Stat n={profile.wins} label="wins" />
          <Stat n={profile.streak} label="streak" />
        </div>
      </div>

      <div className="mt-3 px-1">
        <div className="flex items-center gap-2">
          <div className="font-semibold">{profile.display_name}</div>
          <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] font-semibold uppercase">Lv {profile.level}</span>
          {rank && <span className="rounded-full bg-xp/15 px-2 py-0.5 text-[10px] font-bold text-xp">#{rank}</span>}
        </div>
        <div className="text-xs text-muted-foreground">{profile.school}{profile.grade ? ` · ${profile.grade}` : ""}</div>
        {profile.bio && <p className="mt-1.5 whitespace-pre-wrap text-sm">{profile.bio}</p>}
        {profile.instagram && (
          <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-neon-pink">
            <Instagram className="h-3 w-3" /> @{profile.instagram}
          </a>
        )}
      </div>

      <div className="mt-3 flex gap-2 px-1">
        <Link to="/create" className="flex-1 rounded-lg gradient-primary py-1.5 text-center text-xs font-bold text-primary-foreground">+ Post / Challenge</Link>
        <Link to="/arena" className="flex-1 rounded-lg glass py-1.5 text-center text-xs font-bold">Find Duel</Link>
        <Link to="/settings" className="rounded-lg glass px-3 py-1.5 text-xs font-bold">⚙</Link>
      </div>

      {/* XP bar */}
      <div className="mt-3 px-1">
        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-neon-pink" /> {profile.streak}d streak</span>
          <span>{profile.xp.toLocaleString()} / {lvl.next.toLocaleString()} XP</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full gradient-primary" style={{ width: `${lvl.pct}%` }} />
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3 grid grid-cols-3 gap-2 px-1">
        <MiniStat icon={<Swords className="h-3.5 w-3.5 text-neon-purple" />} value={`${profile.wins}/${profile.losses}`} label="W / L" />
        <MiniStat icon={<Zap className="h-3.5 w-3.5 text-xp" />} value={`${winRate}%`} label="Win rate" />
        <MiniStat icon={<Trophy className="h-3.5 w-3.5 text-success" />} value={profile.level} label="Level" />
      </div>

      {badges.length > 0 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-1">
          {badges.map((b) => (
            <div key={b.label} className="glass flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs">
              <span>{b.icon}</span><span className="font-semibold">{b.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-4 flex border-t border-glass-border">
        <button onClick={() => setTab("grid")} className={`flex-1 py-3 ${tab === "grid" ? "border-t-2 border-foreground -mt-px" : "text-muted-foreground"}`}>
          <Grid3x3 className="mx-auto h-4 w-4" />
        </button>
        <button onClick={() => setTab("feed")} className={`flex-1 py-3 ${tab === "feed" ? "border-t-2 border-foreground -mt-px" : "text-muted-foreground"}`}>
          <Zap className="mx-auto h-4 w-4" />
        </button>
      </div>

      {tab === "grid" ? (
        <div className="grid grid-cols-3 gap-0.5">
          {posts.length === 0 && <div className="col-span-3 p-8 text-center text-sm text-muted-foreground">No posts yet.</div>}
          {posts.map((p) => (
            <button
              key={p.id}
              onClick={() => setOpenPost(p)}
              className="relative aspect-square overflow-hidden bg-secondary/40 p-2 text-left text-[11px] leading-tight"
            >
              {p.type === "challenge" && (
                <span className="absolute right-1 top-1 rounded-full bg-xp/80 px-1.5 py-0.5 text-[9px] font-bold text-black">⚡{p.challenge?.reward_xp ?? ""}</span>
              )}
              <div className="line-clamp-5 break-words">{p.type === "challenge" ? p.challenge?.question ?? p.content : p.content}</div>
              <div className="absolute bottom-1 left-1 text-[9px] text-muted-foreground">❤ {p.likes_count} · 💬 {p.comments_count}</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.length === 0 && <div className="glass rounded-2xl p-4 text-center text-sm text-muted-foreground">No posts yet.</div>}
          {posts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      )}

      {openPost && (
        <div onClick={() => setOpenPost(null)} className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
            <PostCard post={openPost} />
            <button onClick={() => setOpenPost(null)} className="mt-2 w-full rounded-full glass-strong py-2 text-xs">Close</button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="font-display text-lg font-bold">{n}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
function MiniStat({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-xl bg-secondary/40 p-2 text-center">
      <div className="flex items-center justify-center gap-1 text-xs font-bold">{icon}{value}</div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    </div>
  );
}

function computeBadges(p: { streak: number; wins: number; level: number; xp: number }) {
  const out: { icon: string; label: string }[] = [];
  if (p.streak >= 3) out.push({ icon: "🔥", label: `Streak ${p.streak}` });
  if (p.wins >= 1) out.push({ icon: "⚔️", label: "Duelist" });
  if (p.wins >= 10) out.push({ icon: "🏆", label: "Champion" });
  if (p.level >= 5) out.push({ icon: "⚡", label: "Rising" });
  if (p.level >= 10) out.push({ icon: "🧠", label: "Sharp Mind" });
  if (p.xp >= 1000) out.push({ icon: "📚", label: "Scholar" });
  return out;
}

export default ProfilePage;
