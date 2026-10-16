"use client";
import { useEffect, useState } from "react";
import { sb, useProfile, useLive } from "@/lib/app";
import { Shell, Login, inp, btn, card } from "@/components/ui";
import { DEFAULT_CATALOG, type Catalog } from "@/lib/catalog";

export default function Admin() {
  const { session, profile, loading } = useProfile();
  if (loading) return <Shell><p className="text-center mt-20 text-sm">Loading…</p></Shell>;
  if (!session) return <Shell badge="Admin"><Login /></Shell>;
  if (profile?.role !== "admin") return (
    <Shell logout badge="Admin"><div className={card}><p className="font-black">This account is not an admin</p>
      <p className="text-xs text-slate-500">Run the “make me admin” SQL from the README for {session.user.email}, then reload.</p></div></Shell>
  );
  return <Panel />;
}

function Panel() {
  const [tab, setTab] = useState("price");
  const [cat, setCat] = useState<Catalog>(DEFAULT_CATALOG);
  const [cls, setCls] = useState(Object.keys(DEFAULT_CATALOG)[0]);
  const [people, setPeople] = useState<any[]>([]); const [bks, setBks] = useState<any[]>([]);
  const load = async () => {
    const [a, b] = await Promise.all([
      sb.from("profiles").select("*").neq("role", "admin").order("created_at", { ascending: false }),
      sb.from("bookings").select("*, student:profiles!student_id(name), tutor:profiles!tutor_id(name)").order("created_at", { ascending: false }).limit(100),
    ]);
    setPeople(a.data || []); setBks(b.data || []);
  };
  useLive(load);
  useEffect(() => { sb.from("settings").select("value").eq("key", "catalog").maybeSingle().then(({ data }) => data && setCat(data.value)); }, []);
  const save = async () => { const { error } = await sb.from("settings").upsert({ key: "catalog", value: cat }); alert(error ? error.message : "Saved. New prices are live for all students."); };
  const setFee = (s: string, v: number) => setCat({ ...cat, [cls]: { subjects: { ...cat[cls].subjects, [s]: v || 0 } } });
  const setApproved = async (id: string, v: boolean) => { await sb.from("profiles").update({ approved: v }).eq("id", id); load(); };
  const openDoc = async (path: string) => { const { data } = await sb.storage.from("kyc").createSignedUrl(path, 120); if (data) window.open(data.signedUrl, "_blank"); };
  const pending = people.filter((u) => u.role === "tutor" && !u.approved).length;
  const earned = bks.filter((b) => b.status === "completed").reduce((s, b) => s + b.price - b.payout, 0);
  return (
    <Shell logout badge="Admin" tabs={[["price", "💰 Pricing"], ["people", `👥 People${pending ? ` (${pending})` : ""}`], ["bk", "📋 Bookings"]]} tab={tab} setTab={setTab}>
      {tab === "price" && (<>
        <select className={inp} value={cls} onChange={(e) => setCls(e.target.value)}>{Object.keys(cat).map((c) => <option key={c}>{c}</option>)}</select>
        {Object.entries(cat[cls].subjects).map(([s, v]) => (
          <div key={s} className={card + " flex items-center justify-between gap-3"}>
            <div className="min-w-0"><p className="text-sm font-bold truncate">{s}</p><p className="text-[11px] text-slate-500">Tutor ₹{Math.round(v * 0.8)} • You ₹{Math.round(v * 0.2)}</p></div>
            <div className="flex items-center gap-1 shrink-0">₹<input type="number" inputMode="numeric" className={inp + " w-24 text-center font-black"} value={v} onChange={(e) => setFee(s, Number(e.target.value))} />/hr</div>
          </div>
        ))}
        <button className={btn} onClick={save}>Save prices</button>
      </>)}
      {tab === "people" && (<>
        <button onClick={load} className="text-xs font-bold text-blue-600">Refresh list</button>
        {people.map((u) => (
          <div key={u.id} className={card}>
            <div className="flex justify-between gap-2">
              <div className="min-w-0">
                <b className="text-sm">{u.name}</b> <span className="text-[10px] bg-slate-200 px-1.5 rounded">{u.role}</span>
                <p className="text-xs text-slate-500 break-all">{u.email} • {u.phone}</p>
                {u.role === "tutor" && <p className="text-[11px] text-slate-500">{u.classes.join(", ")}</p>}
              </div>
              {u.role === "tutor" && <span className={`text-xs font-bold ${u.approved ? "text-emerald-600" : "text-amber-600"}`}>{u.approved ? "Approved" : "Pending"}</span>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(u.docs || {}).map(([k, v]: any) => <button key={k} onClick={() => openDoc(v)} className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-bold text-blue-600">👁 {k}</button>)}
            </div>
            {u.role === "tutor" && (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setApproved(u.id, true)} className="py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">Approve</button>
                <button onClick={() => setApproved(u.id, false)} className="py-2 rounded-xl bg-red-600 text-white text-xs font-bold">Reject</button>
              </div>
            )}
          </div>
        ))}
      </>)}
      {tab === "bk" && (<>
        <div className={card + " text-center"}><p className="text-xs text-slate-500">Your commission from completed classes</p><p className="text-3xl font-black text-blue-600">₹{earned}</p></div>
        {bks.map((b) => (
          <div key={b.id} className={card}>
            <div className="flex justify-between text-sm font-bold"><span>{b.student?.name} → {b.tutor?.name || "no tutor yet"}</span><span>₹{b.price}</span></div>
            <p className="text-xs text-slate-500">{b.class} • {b.subjects.join(", ")} • {b.status}</p>
          </div>
        ))}
      </>)}
    </Shell>
  );
}
