"use client";
import { useState } from "react";
import { sb } from "@/lib/app";

export const inp = "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-base text-slate-900 focus:outline-none focus:border-blue-500";
export const btn = "w-full py-3 rounded-2xl text-sm font-black text-white bg-blue-600 active:scale-[0.98] transition disabled:opacity-50";
export const card = "p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2";
export const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// Phone-first frame: full screen on phones, a 9:16 phone shape on desktop
export function Shell({ children, tabs, tab, setTab, logout, badge }: any) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-[440px] h-dvh md:h-[min(96dvh,782px)] md:rounded-[2rem] md:border-4 md:border-slate-800 bg-white text-slate-900 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
        <header className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white grid place-items-center font-black">V</div>
            <b>VidyaNow</b>
            {badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100">{badge}</span>}
          </div>
          {logout && <button onClick={() => sb.auth.signOut()} className="text-xs font-bold text-slate-500">Log out</button>}
        </header>
        <main className="flex-1 overflow-y-auto p-4 space-y-4">{children}</main>
        {tabs && (
          <nav className="shrink-0 flex border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
            {tabs.map(([id, label]: string[]) => (
              <button key={id} onClick={() => setTab(id)} className={`flex-1 py-3 text-xs font-bold ${tab === id ? "text-blue-600" : "text-slate-400"}`}>{label}</button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

export function Login() {
  const [email, setEmail] = useState(""); const [code, setCode] = useState("");
  const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<any>) => { setBusy(true); const { error } = await fn(); setBusy(false); if (error) alert(error.message); return !error; };
  return (
    <div className="pt-8 space-y-5 text-center">
      <h2 className="text-2xl font-black">Verified home tutors, fast</h2>
      <p className="text-xs text-slate-500">Sign in with a one-time code sent to your email</p>
      {!sent ? (
        <form onSubmit={async (e) => { e.preventDefault(); if (await run(() => sb.auth.signInWithOtp({ email }))) setSent(true); }} className="space-y-3">
          <input className={inp} type="email" required placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className={btn} disabled={busy}>Send code</button>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); run(() => sb.auth.verifyOtp({ email, token: code.trim(), type: "email" })); }} className="space-y-3">
          <p className="text-xs">Code sent to <b>{email}</b></p>
          <input className={`${inp} text-center tracking-[0.5em] font-black`} inputMode="numeric" required maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} />
          <button className={btn} disabled={busy}>Verify and continue</button>
          <button type="button" onClick={() => setSent(false)} className="text-xs text-blue-600 font-bold">Change email</button>
        </form>
      )}
    </div>
  );
}
