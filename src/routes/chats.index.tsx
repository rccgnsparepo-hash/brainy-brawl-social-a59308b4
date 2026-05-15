import { Link } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Search, MessageCircle } from "lucide-react";


interface Conv {
  other_id: string;
  other: { handle: string; display_name: string; avatar: string };
  last: string;
  unread: number;
  at: string;
}

function ChatsPage() {
  const { user } = useAuth();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);

  const loadConvs = async () => {
    if (!user) return;
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, sender_id, recipient_id, content, read, created_at")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(200);
    const map = new Map<string, Conv>();
    const ids = new Set<string>();
    (msgs ?? []).forEach((m: any) => {
      const other = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      ids.add(other);
      if (!map.has(other)) {
        map.set(other, { other_id: other, other: { handle: "", display_name: "", avatar: "👤" }, last: m.content, unread: 0, at: m.created_at });
      }
      if (!m.read && m.recipient_id === user.id) {
        const c = map.get(other)!;
        c.unread += 1;
      }
    });
    if (ids.size) {
      const { data: profs } = await supabase.from("profiles").select("id, handle, display_name, avatar").in("id", [...ids]);
      (profs ?? []).forEach((p: any) => {
        const c = map.get(p.id);
        if (c) c.other = { handle: p.handle, display_name: p.display_name, avatar: p.avatar };
      });
    }
    setConvs([...map.values()]);
  };

  useEffect(() => {
    loadConvs();
    if (!user) return;
    const ch = supabase
      .channel(`my-msgs-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => loadConvs())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const term = `%${q.trim()}%`;
      const { data } = await supabase
        .from("profiles")
        .select("id, handle, display_name, avatar, school")
        .or(`handle.ilike.${term},display_name.ilike.${term}`)
        .neq("id", user?.id ?? "00000000-0000-0000-0000-000000000000")
        .limit(15);
      setResults(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q, user?.id]);

  return (
    <AppShell title={<div className="font-display text-lg font-bold">Chats</div>}>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search students by @handle or name"
          className="w-full rounded-full glass py-2.5 pl-9 pr-3 text-sm outline-none"
        />
      </div>

      {q && (
        <div className="mb-4 space-y-2">
          {results.map((p) => (
            <Link key={p.id} to={`/chats/${p.id}`} className="glass flex items-center gap-3 rounded-xl p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-lg">{p.avatar}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p.display_name}</div>
                <div className="truncate text-xs text-muted-foreground">@{p.handle} · {p.school}</div>
              </div>
              <MessageCircle className="h-4 w-4 text-neon-blue" />
            </Link>
          ))}
          {results.length === 0 && <div className="text-center text-xs text-muted-foreground">No matches</div>}
        </div>
      )}

      {!q && (
        <div className="space-y-2">
          {convs.length === 0 && (
            <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
              No chats yet. Search for someone above to start a conversation.
            </div>
          )}
          {convs.map((c) => (
            <Link key={c.other_id} to={`/chats/${c.other_id}`} className="glass flex items-center gap-3 rounded-xl p-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full gradient-primary text-xl">{c.other.avatar}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-semibold">{c.other.display_name || "User"}</span>
                  {c.unread > 0 && <span className="rounded-full bg-neon-pink px-2 py-0.5 text-[10px] font-bold text-white">{c.unread}</span>}
                </div>
                <div className="truncate text-xs text-muted-foreground">{c.last}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

export default ChatsPage;
