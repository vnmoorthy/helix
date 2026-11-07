"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, Radio, Database, FlaskConical, X } from "lucide-react";
import type { Track } from "@/lib/types";
import { getStatus, type Status } from "@/lib/client";
export type { Status };

export const TRACK_COLOR: Record<Track, string> = {
  visual: "#d9f99d",
  spoken: "#f9a8d4",
  onscreen: "#7dd3fc",
  sound: "#fcd34d",
  format: "#c4b5fd",
};
export const TRACK_LABEL: Record<Track, string> = { visual: "Visual", spoken: "Spoken", onscreen: "On-screen", sound: "Sound", format: "Format" };
export const TRACK_FIELD: Record<Track, string> = {
  visual: "AI Vision · frames[].visualSimilarityScore",
  spoken: "transcriptChunks[]",
  onscreen: "frames[].onScreenTextRegions[]",
  sound: "audioTitle · audioAuthor · audioCopyrighted",
  format: "media.duration · caption · hashtags",
};

export const fmt = (n: number) => {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + "K";
  return String(Math.round(n));
};
export const fmtT = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <defs>
          <linearGradient id="lg" x1="0" x2="1">
            <stop offset="0" stopColor="#e4f56a" />
            <stop offset="1" stopColor="#f2b5e3" />
          </linearGradient>
        </defs>
        <path d="M9 3c0 7 14 7 14 13S9 22 9 29" stroke="url(#lg)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M23 3c0 7-14 7-14 13s14 6 14 13" stroke="url(#lg)" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".55" />
        {[7, 12.5, 19.5, 25].map((y, i) => (
          <line key={i} x1="11" x2="21" y1={y} y2={y} stroke={["#d9f99d", "#f9a8d4", "#7dd3fc", "#fcd34d"][i]} strokeWidth="2" strokeLinecap="round" />
        ))}
      </svg>
      <span className="text-[19px] font-semibold tracking-tight">Helix</span>
      <span className="hidden sm:inline text-[11px] mono text-muted border border-line rounded-full px-2 py-0.5 group-hover:text-ink transition">video genome</span>
    </Link>
  );
}

export function HelixArt({ className = "" }: { className?: string }) {
  const pairs = 22;
  const colors = ["#d9f99d", "#f9a8d4", "#7dd3fc", "#fcd34d", "#c4b5fd"];
  return (
    <div className={`relative ${className}`} aria-hidden>
      <svg viewBox="0 0 220 520" className="w-full h-full">
        {Array.from({ length: pairs }).map((_, i) => {
          const y = 14 + i * 23;
          return (
            <motion.g key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
              <motion.line
                y1={y}
                y2={y}
                stroke={colors[i % colors.length]}
                strokeWidth={3}
                strokeLinecap="round"
                animate={{ x1: [40, 180, 40], x2: [180, 40, 180], opacity: [1, 0.35, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: i * 0.18 }}
              />
              <motion.circle r={6} cy={y} fill={colors[i % colors.length]} animate={{ cx: [40, 180, 40] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: i * 0.18 }} />
              <motion.circle r={6} cy={y} fill="#f4f4ef" animate={{ cx: [180, 40, 180], opacity: [0.9, 0.3, 0.9] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: i * 0.18 }} />
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}


export function useStatus() {
  const [s, setS] = useState<Status | null>(null);
  const load = () => getStatus().then(setS).catch(() => {});
  useEffect(() => {
    load();
  }, []);
  return { status: s, reload: load };
}

export function StatusPill({ status, onConnect }: { status: Status | null; onConnect: () => void }) {
  if (!status) return <div className="h-8 w-40 rounded-full bg-panel2 animate-pulse" />;
  if (status.static)
    return (
      <span className="flex items-center gap-1.5 text-xs mono rounded-full border border-sky/40 text-sky px-3 py-1.5" title="Static GitHub Pages edition: niches pre-sequenced from live Oriane data">
        <Database size={13} /> {status.cached.length} niches · live Oriane data
      </span>
    );
  return (
    <div className="flex items-center gap-2">
      {status.oriane ? (
        <span className="flex items-center gap-1.5 text-xs mono rounded-full border border-lime/40 text-lime px-3 py-1.5">
          <Radio size={13} className="animate-pulse" /> Oriane live
        </span>
      ) : (
        <button onClick={onConnect} className="flex items-center gap-1.5 text-xs mono rounded-full border border-amber/40 text-amber px-3 py-1.5 hover:bg-amber/10 transition">
          <KeyRound size={13} /> Connect Oriane
        </button>
      )}
      {status.llm && <span className="hidden md:inline text-xs mono rounded-full border border-line text-muted px-3 py-1.5">LLM: {status.llm}</span>}
    </div>
  );
}

export function KeyModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [key, setKey] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    setErr("");
    const r = await fetch("/api/key", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(j.error || "Failed");
    onSaved();
    onClose();
  };
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="card bg-panel w-full max-w-md p-6" initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold">Connect Oriane</h3>
              <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close"><X size={18} /></button>
            </div>
            <p className="text-sm text-muted mb-4">Paste your Oriane API key. Helix calls <span className="mono text-ink">connect.oriane.xyz/rest/contents/search</span> for every analysis. The key stays on this machine (.env.local).</p>
            <input value={key} onChange={(e) => setKey(e.target.value)} type="password" placeholder="ori_…" className="w-full bg-panel2 border border-line rounded-xl px-4 py-3 mono text-sm outline-none focus:border-lime/60" autoFocus />
            {err && <p className="text-sm text-red-400 mt-2">{err}</p>}
            <button disabled={busy || key.length < 10} onClick={save} className="mt-4 w-full grad-bg text-black font-semibold rounded-xl py-3 disabled:opacity-40">{busy ? "Saving…" : "Go live"}</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SourceBadge({ source, fetchedAt }: { source: "live" | "cache" | "sample"; fetchedAt?: string }) {
  if (source === "live")
    return <span className="inline-flex items-center gap-1.5 text-xs mono rounded-full bg-lime/10 border border-lime/40 text-lime px-2.5 py-1"><Radio size={12} /> LIVE · Oriane API</span>;
  if (source === "cache")
    return <span className="inline-flex items-center gap-1.5 text-xs mono rounded-full bg-sky/10 border border-sky/40 text-sky px-2.5 py-1"><Database size={12} /> Oriane data · sequenced {fetchedAt ? new Date(fetchedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}</span>;
  return <span className="inline-flex items-center gap-1.5 text-xs mono rounded-full bg-amber/10 border border-amber/40 text-amber px-2.5 py-1"><FlaskConical size={12} /> SAMPLE DATA · connect Oriane for live</span>;
}

export function Thumb({ src, seed, className = "", children }: { src?: string; seed: string; className?: string; children?: React.ReactNode }) {
  const [bad, setBad] = useState(!src);
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return (
    <div className={`relative overflow-hidden bg-panel2 ${className}`} style={bad ? { background: `linear-gradient(135deg, hsl(${h} 45% 22%), hsl(${(h + 60) % 360} 50% 12%))` } : undefined}>
      {!bad && src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" referrerPolicy="no-referrer" loading="lazy" className="absolute inset-0 w-full h-full object-cover" onError={() => setBad(true)} />
      )}
      {children}
    </div>
  );
}
