"use client";
import { useEffect, useState } from "react";
import { sb, rpc, useProfile, useLive, useTick } from "@/lib/app";
import { Shell, Login, inp, btn, card, fmt } from "@/components/ui";
import { DEFAULT_CATALOG, COMMISSION, calcPrice, type Catalog } from "@/lib/catalog";

const DOCS: any = { photo: "Selfie / profile photo", degree: "Degree certificate", id: "Govt ID proof" };

export default function Home() {
  const { session, profile, loading, reload } = useProfile();
  if (loading) return <Shell><div className="mx-auto mt-20 w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></Shell>;
  if (!session) return <Shell><Login /></Shell>;
  if (!profile) return <Shell logout><Onboard session={session} reload={reload} /></Shell>;
  if (profile.role === "admin") return <Shell logout><a href="/admin" className={btn + " block text-center"}>Open admin panel</a></Shell>;
  return profile.role === "student" ? <Student p={profile} /> : <Tutor p={profile} reload={reload} />;
}

function Onboard({ session, reload }: any) {
  const [role, setRole] = useState("student");
  const [f, setF] = useState({ name: "", phone: "" });
  const [classes, setClasses] = useState<string[]>([]);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [busy, setBusy] = useState(false);
  const need = role === "tutor" ? ["photo", "degree", "id"] : ["id"];
  const pick = (k: string) => (e: any) => {
    const x = e.target.files?.[0];
    if (x && x.size > 5e6) return alert("File must be under 5 MB");
    if (x) setFiles({ ...files, [k]: x });
  };
  const submit = async (e: any) => {
    e.preventDefault();
    if (need.some((k) => !files[k])) return alert("Please upload all documents");
    if (role === "tutor" && !classes.length) return alert("Pick at least one class you teach");
    setBusy(true);
    try {
      const uid = session.user.id, docs: any = {};
      for (const k of need) {
        const path = `${uid}/${k}-${Date.now()}`;
        const { error } = await sb.storage.from("kyc").upload(path, files[k]);
        if (error) throw error;
        docs[k] = path;
      }
      const { error } = await sb.from("profiles").insert({ id: uid, role, email: session.user.email, name: f.name, phone: f.phone, classes, docs });
      if (error) throw error;
      reload();
    } catch (err: any) { alert(err.message); }
    setBusy(false);
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <h3 className="text-lg font-black">Set up your account</h3>
      <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-2xl">
        {[["student", "Student / Parent"], ["tutor", "Tutor"]].map(([r, l]) => (
          <button key={r} type="button" onClick={() => setRole(r)} className={`py-2 text-xs font-bold rounded-xl ${role === r ? "bg-white text-blue-600" : "text-slate-500"}`}>{l}</button>
        ))}
      </div>
      <input className={inp} required placeholder="Full legal name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <input className={inp} required type="tel" inputMode="numeric" placeholder="Mobile number (for calls)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      {role === "tutor" && (
        <div className={card}>
          <b className="text-xs">Classes you teach</b>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(DEFAULT_CATALOG).map((c) => (
              <button key={c} type="button" onClick={() => setClasses(classes.includes(c) ? classes.filter((x) => x !== c) : [...classes, c])}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border ${classes.includes(c) ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-slate-200"}`}>{classes.includes(c) ? "✓ " : "+ "}{c}</button>
            ))}
          </div>
        </div>
      )}
      {need.map((k) => (
        <label key={k} className={card + " flex items-center justify-between cursor-pointer"}>
          <span className="text-xs font-bold">{DOCS[k]}</span>
          <span className="text-xs font-bold text-blue-600 truncate max-w-[50%]">{files[k] ? "✓ " + files[k].name : "Choose file"}</span>
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={pick(k)} />
        </label>
      ))}
      <button className={btn} disabled={busy}>{busy ? "Uploading…" : role === "tutor" ? "Submit for approval" : "Continue"}</button>
    </form>
  );
}

function Student({ p }: any) {
  const [tab, setTab] = useState("book");
  const [cat, setCat] = useState<Catalog>(DEFAULT_CATALOG);
  const [bks, setBks] = useState<any[]>([]);
  const [cls, setCls] = useState(Object.keys(DEFAULT_CATALOG)[2]);
  const [subs, setSubs] = useState<string[]>([]);
  const [topic, setTopic] = useState(""); const [hrs, setHrs] = useState(1);
  const [addr, setAddr] = useState(""); const [dismissed, setDismissed] = useState("");
  const now = useTick();
  const load = async () => {
    const { data } = await sb.from("bookings").select("*, tutor:profiles!tutor_id(name,phone), booking_otps(start_otp,end_otp)").eq("student_id", p.id).order("created_at", { ascending: false });
    setBks(data || []);
  };
  useLive(load);
  useEffect(() => { sb.from("settings").select("value").eq("key", "catalog").maybeSingle().then(({ data }) => data && setCat(data.value)); }, []);
  useEffect(() => { setSubs([Object.keys(cat[cls]?.subjects || {})[0]]); }, [cls, cat]);
  const toggle = (s: string) => setSubs(subs.includes(s) ? (subs.length > 1 ? subs.filter((x) => x !== s) : subs) : [...subs, s]);
  const gps = () => navigator.geolocation?.getCurrentPosition((x) => setAddr((a) => `${a} (${x.coords.latitude.toFixed(5)},${x.coords.longitude.toFixed(5)})`.trim()), () => alert("Could not get your location"), { timeout: 7000 });
  const book = async () => {
    if (!addr.trim()) return alert("Enter your address first");
    const price = calcPrice(cat, cls, subs, hrs);
    const { error } = await sb.from("bookings").insert({ student_id: p.id, class: cls, subjects: subs, topic, hours: hrs, address: addr, price, payout: Math.round(price * (1 - COMMISSION)) });
    if (error) alert(error.message); else load();
  };
  const act = bks.find((b) => ["searching", "enroute", "in_class"].includes(b.status) || (b.status === "completed" && b.id !== dismissed && now - +new Date(b.ended_at) < 6e5));
  const o: any = ([] as any[]).concat(act?.booking_otps || [])[0] || {};
  const timer = act?.started_at ? Math.max(0, Math.floor((now - +new Date(act.started_at)) / 1000)) : 0;
  return (
    <Shell logout tabs={[["book", "🏠 Book"], ["hist", "🕒 History"]]} tab={tab} setTab={setTab}>
      {tab === "hist" ? (
        bks.length ? bks.map((b) => (
          <div key={b.id} className={card}>
            <div className="flex justify-between text-sm font-bold"><span>{b.subjects.join(", ")}</span><span>₹{b.price}</span></div>
            <p className="text-xs text-slate-500">{b.class} • {b.hours}h • {b.status} • {new Date(b.created_at).toLocaleDateString()}</p>
          </div>
        )) : <p className="text-sm text-slate-400 text-center mt-10">No classes yet. Book your first one.</p>
      ) : act ? (
        <div className="space-y-4">
          {act.status === "searching" && (
            <div className={card + " text-center py-8"}>
              <div className="mx-auto w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="font-black">Finding a verified tutor nearby…</p>
              <p className="text-xs text-slate-500">{act.class} • ₹{act.price}, cash after class</p>
              <button onClick={() => rpc("cancel_booking", { bid: act.id })} className="text-xs font-bold text-red-600">Cancel request</button>
            </div>
          )}
          {(act.status === "enroute" || act.status === "in_class") && (<>
            <div className={card}>
              <p className="font-black">{act.tutor?.name}</p>
              <a className="text-sm text-blue-600 font-bold" href={`tel:${act.tutor?.phone}`}>📞 {act.tutor?.phone}</a>
            </div>
            {act.status === "enroute" ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <p className="text-xs font-bold text-emerald-800">Start code: share it when the tutor arrives</p>
                <p className="text-4xl font-black tracking-widest text-emerald-600">{o.start_otp}</p>
              </div>
            ) : (<>
              <div className="p-5 bg-emerald-600 text-white rounded-3xl text-center">
                <p className="text-xs font-bold">Class in progress</p>
                <p className="text-4xl font-black font-mono">{fmt(timer)}</p>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <p className="text-xs font-bold text-amber-800">End code: share it when the class finishes</p>
                <p className="text-4xl font-black tracking-widest text-amber-600">{o.end_otp}</p>
              </div>
            </>)}
          </>)}
          {act.status === "completed" && (
            <div className={card + " text-center"}>
              <p className="text-3xl">✓</p><p className="font-black">Class finished</p>
              <p className="text-sm">Pay the tutor <b>₹{act.price}</b> in cash</p>
              <button className={btn} onClick={() => setDismissed(act.id)}>Done</button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className={card}>
            <div className="flex justify-between"><b className="text-xs">📍 Where should the tutor come?</b><button type="button" onClick={gps} className="text-xs text-blue-600 font-bold">Use GPS</button></div>
            <input className={inp} placeholder="Flat no., house, landmark…" value={addr} onChange={(e) => setAddr(e.target.value)} />
          </div>
          <div><label className="text-xs font-black">Class / course</label>
            <select className={inp} value={cls} onChange={(e) => setCls(e.target.value)}>{Object.keys(cat).map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="text-xs font-black">Subject(s)</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {Object.keys(cat[cls]?.subjects || {}).map((s) => (
                <button key={s} type="button" onClick={() => toggle(s)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${subs.includes(s) ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 border-slate-200"}`}>{subs.includes(s) ? "✓ " : "+ "}{s}</button>
              ))}
            </div></div>
          <input className={inp} placeholder="Specific topic (optional)" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <div className="grid grid-cols-3 gap-2">
            {[1, 1.5, 2].map((h) => <button key={h} type="button" onClick={() => setHrs(h)} className={`py-2 rounded-xl border text-xs font-black ${hrs === h ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200"}`}>{h} hr</button>)}
          </div>
          <button onClick={book} className={btn + " flex justify-between px-4"}><span>⚡ Request tutor</span><span>₹{calcPrice(cat, cls, subs, hrs)} • cash after class</span></button>
        </div>
      )}
    </Shell>
  );
}

function Tutor({ p, reload }: any) {
  const [tab, setTab] = useState("jobs");
  const [bks, setBks] = useState<any[]>([]); const [otp, setOtp] = useState("");
  const load = async () => {
    const { data } = await sb.from("bookings").select("*, student:profiles!student_id(name,phone)").order("created_at", { ascending: false });
    setBks(data || []);
  };
  useLive(load);
  if (!p.approved) return (
    <Shell logout>
      <div className={card + " text-center py-10"}>
        <p className="text-3xl">⏳</p><p className="font-black">Application under review</p>
        <p className="text-xs text-slate-500">We are checking your documents. You can start taking jobs once approved.</p>
        <button className={btn} onClick={reload}>Check status</button>
      </div>
    </Shell>
  );
  const mine = bks.filter((b) => b.tutor_id === p.id);
  const act = mine.find((b) => ["enroute", "in_class"].includes(b.status));
  const open = bks.filter((b) => b.status === "searching" && p.classes.includes(b.class));
  const done = mine.filter((b) => b.status === "completed");
  const go = async (phase: string) => { if (await rpc("verify_otp", { bid: act.id, code: otp, phase })) { setOtp(""); load(); } };
  const a = "font-bold py-2.5 rounded-xl text-xs text-center text-white ";
  return (
    <Shell logout badge="Partner" tabs={[["jobs", "⚡ Jobs"], ["earn", "💰 Earnings"]]} tab={tab} setTab={setTab}>
      {tab === "earn" ? (<>
        <div className={card + " text-center"}><p className="text-xs text-slate-500">Total earned</p><p className="text-3xl font-black text-emerald-600">₹{done.reduce((s, b) => s + b.payout, 0)}</p></div>
        {done.map((b) => (
          <div key={b.id} className={card}>
            <div className="flex justify-between text-sm font-bold"><span>{b.subjects.join(", ")}</span><span className="text-emerald-600">₹{b.payout}</span></div>
            <p className="text-xs text-slate-500">{b.class} • {new Date(b.ended_at).toLocaleDateString()}</p>
          </div>
        ))}
      </>) : (<>
        <div className="flex justify-between items-center">
          <b>{p.name}</b>
          <button onClick={async () => { await sb.from("profiles").update({ online: !p.online }).eq("id", p.id); reload(); }}
            className={`text-xs font-bold px-3 py-1 rounded-full border ${p.online ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-slate-200 text-slate-600"}`}>{p.online ? "Online" : "Offline"}</button>
        </div>
        {act ? (
          <div className="p-4 border-2 border-emerald-500/30 rounded-2xl space-y-3">
            <div className="flex justify-between">
              <div>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">{act.status === "enroute" ? "🚗 On the way" : "🟢 In class"}</span>
                <p className="font-black mt-1">{act.student?.name}</p>
                <p className="text-xs text-slate-500">{act.subjects.join(", ")} • {act.hours}h</p>
              </div>
              <p className="text-xl font-black text-emerald-600">₹{act.payout}</p>
            </div>
            <p className="text-xs bg-slate-50 rounded-xl p-2.5">📍 {act.address}</p>
            <div className="grid grid-cols-2 gap-2">
              <a className={a + "bg-blue-600"} target="_blank" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(act.address)}`}>🧭 Maps</a>
              <a className={a + "bg-emerald-600"} href={`tel:${act.student?.phone}`}>📞 Call student</a>
            </div>
            <input className={inp + " text-center font-black"} inputMode="numeric" maxLength={4} placeholder={act.status === "enroute" ? "Student's start code" : "Student's end code"} value={otp} onChange={(e) => setOtp(e.target.value)} />
            <button className={btn} onClick={() => go(act.status === "enroute" ? "start" : "end")}>{act.status === "enroute" ? "Start class" : "End class"}</button>
          </div>
        ) : !p.online ? <p className="text-sm text-slate-400 text-center mt-10">You are offline. Go online to see requests.</p>
        : open.length ? open.map((b) => (
          <div key={b.id} className={card}>
            <div className="flex justify-between"><b className="text-sm">{b.subjects.join(", ")}</b><b className="text-emerald-600">₹{b.payout}</b></div>
            <p className="text-xs text-slate-500">{b.class} • {b.hours}h{b.topic ? ` • ${b.topic}` : ""}</p>
            <button className={btn} onClick={async () => { await rpc("accept_booking", { bid: b.id }); load(); }}>Accept job ✓</button>
          </div>
        )) : <p className="text-sm text-slate-400 text-center mt-10">Waiting for requests in your classes…</p>}
      </>)}
    </Shell>
  );
}
