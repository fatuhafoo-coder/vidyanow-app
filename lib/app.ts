import { createClient, type Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

export const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function rpc(fn: string, args: any) {
  const { error } = await sb.rpc(fn, args);
  if (error) alert(error.message);
  return !error;
}

export function useProfile() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = async (s: Session | null) => {
    if (s) { const { data } = await sb.from("profiles").select("*").eq("id", s.user.id).maybeSingle(); setProfile(data); }
    else setProfile(null);
    setLoading(false);
  };
  useEffect(() => {
    const { data } = sb.auth.onAuthStateChange((_e, s) => { setSession(s); setTimeout(() => load(s), 0); });
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, profile, loading, reload: () => load(session) };
}

// Runs cb now and again whenever any booking changes (realtime, RLS-filtered per user)
export function useLive(cb: () => void) {
  useEffect(() => {
    cb();
    const ch = sb.channel("bk-" + Math.random()).on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => cb()).subscribe();
    return () => { sb.removeChannel(ch); };
  }, []);
}

export function useTick() {
  const [n, setN] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setN(Date.now()), 1000); return () => clearInterval(i); }, []);
  return n;
}
