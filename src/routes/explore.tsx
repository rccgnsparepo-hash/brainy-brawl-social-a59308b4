import { AppShell } from "@/components/app-shell";
import { Search, TrendingUp, Swords, Users, School } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";


const sections = ["School Wars", "Top Minds", "Brain Challenges"] as const;

interface SchoolAgg {
  school: string;
  total_xp: number;
  members: number;
}
interface TopUser {
  id: string;
  handle: string;
  display_name: string;
  avatar: string;
  school: string;
  xp: number;
  level: number;
}

function ExplorePage() {
  const [tab, setTab] = useState<(typeof sections)[number]>("School Wars");
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<TopUser[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, handle, display_name, avatar, school, xp, level")
      .order("xp", { ascending: false })
      .limit(50)
      .then(({ data }) => setUsers((data ?? []) as TopUser[]));

    supabase
      .from("challenges")
      .select("id, question, difficulty, reward_xp, solved_count, creator:profiles!challenges_creator_id_fkey(handle, school)")
      .order("solved_count", { ascending: false })
      .limit(30)
      .then(({ data }) => setChallenges(data ?? []));

    const ch = supabase
      .channel("explore-profiles")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        const u = payload.new as TopUser;
        setUsers((prev) => {
          const next = prev.map((x) => (x.id === u.id ? { ...x, ...u } : x));
          return next.sort((a, b) => b.xp - a.xp);
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const schools = useMemo<SchoolAgg[]>(() => {
    const m = new Map<string, SchoolAgg>();
    for (const u of users) {
      const cur = m.get(u.school) ?? { school: u.school, total_xp: 0, members: 0 };
      cur.total_xp += u.xp;
      cur.members += 1;
      m.set(u.school, cur);
    }
    return [...m.values()].sort((a, b) => b.total_xp - a.total_xp);
  }, [users]);

  const filteredUsers = users.filter(
    (u) => !q || u.handle.includes(q.toLowerCase()) || u.display_name.toLowerCase().includes(q.toLowerCase()) || u.school.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell
      title={
        <div className="flex w-full items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search users, schools…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      }
    >
      <div className="no-scrollbar -mx-3 mb-3 flex gap-2 overflow-x-auto px-3">
        {sections.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              tab === s ? "gradient-primary text-primary-foreground glow" : "glass text-muted-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {tab === "School Wars" && (
        <div className="space-y-2 animate-fade-in">
          {schools.length === 0 && <Empty label="No schools yet" />}
          {schools.map((s, i) => (
            <div key={s.school} className="glass flex items-center gap-3 rounded-2xl p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-hot font-display font-bold">{i + 1}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <School className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{s.school}</span>
                </div>
                <div className="text-xs text-muted-foreground">{s.members} members</div>
              </div>
              <div className="text-right">
                <div className="font-display font-bold text-gradient">{s.total_xp.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">XP</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Top Minds" && (
        <div className="space-y-2 animate-fade-in">
          {filteredUsers.length === 0 && <Empty label="No students found" />}
          {filteredUsers.map((u, i) => (
            <div key={u.id} className="glass flex items-center gap-3 rounded-2xl p-3">
              <span className="w-6 text-center font-display font-bold text-muted-foreground">#{i + 1}</span>
              <div className="flex h-11 w-11 items-center justify-center rounded-full gradient-primary text-xl">{u.avatar}</div>
              <div className="flex-1">
                <div className="font-semibold">{u.display_name}</div>
                <div className="text-xs text-muted-foreground">@{u.handle} · {u.school}</div>
              </div>
              <div className="text-right">
                <div className="font-display font-bold text-gradient">Lv {u.level}</div>
                <div className="text-xs text-muted-foreground">{u.xp.toLocaleString()} XP</div>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> {users.length} ranked students
          </div>
        </div>
      )}

      {tab === "Brain Challenges" && (
        <div className="space-y-2 animate-fade-in">
          {challenges.length === 0 && <Empty label="No challenges yet" />}
          {challenges.map((c) => (
            <div key={c.id} className="glass rounded-2xl p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>@{c.creator?.handle ?? "?"} · {c.creator?.school ?? ""}</span>
                <span className="text-xp">+{c.reward_xp} XP</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm font-medium">{c.question}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <Swords className="h-3.5 w-3.5" />
                <span>{c.solved_count} solved</span>
                <span>·</span>
                <span className="uppercase">{c.difficulty}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">{label}</div>;
}

export default ExplorePage;
