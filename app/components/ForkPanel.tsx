"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Download, GitFork, Loader2, Printer, Users, X, Sparkles } from "lucide-react";
import type { ForkPlan, GeneStat, SlimVideo } from "@/lib/types";
import { TRACK_COLOR, fmtT } from "./ui";
import { forkPlan } from "@/lib/client";

type Props = {
  niche: string;
  stats: GeneStat[];
  initialGenes: string[];
  source?: SlimVideo | null;
  trendingSound?: string;
  onClose: () => void;
  initialProduct?: string;
  initialCreator?: string;
};

function toMarkdown(p: ForkPlan, stats: GeneStat[]) {
  const label = (id: string) => stats.find((s) => s.id === id)?.label || id;
  const lines = [
    `# ${p.title}`,
    ``,
    `Creator: @${p.creator.replace(/^@/, "")} · Length: ${p.duration}s · Genome lift score: ${p.predictedLift}×`,
    ``,
    `| Beat | Time | Shot | Say | On-screen | Sound | Inherited genes |`,
    `|---|---|---|---|---|---|---|`,
    ...p.beats.map((b) => `| ${b.slot} | ${fmtT(b.start)}–${fmtT(b.end)} | ${b.shot} | ${b.say} | ${b.onscreen} | ${b.sound} | ${b.genes.map(label).join(", ")} |`),
    ``,
    `Caption: ${p.caption}`,
    p.hashtags.length ? `Hashtags: ${p.hashtags.map((h) => "#" + h).join(" ")}` : "",
    ``,
    `_Forked with Helix: structure inherited, content original._`,
  ];
  return lines.join("\n");
}

export function ForkPanel({ niche, stats, initialGenes, source, trendingSound, onClose, initialProduct, initialCreator }: Props) {
  const [mode, setMode] = useState<"single" | "roster">("single");
  const [product, setProduct] = useState(initialProduct || "");
  const [creator, setCreator] = useState(initialCreator || "");
  const [audience, setAudience] = useState("");
  const [style, setStyle] = useState<"face" | "faceless" | "hands">("face");
  const [genes, setGenes] = useState<string[]>(initialGenes);
  const [plan, setPlan] = useState<ForkPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [roster, setRoster] = useState(`@maya.lifts, whey protein cold brew\n@techwithtom, AI note-taking app\n@glowbyjess, vitamin C serum\n@dad.cooks, 15-minute meal prep\n@runwithraj, marathon training plan`);
  const [rosterPlans, setRosterPlans] = useState<ForkPlan[]>([]);

  useEffect(() => setGenes(initialGenes), [initialGenes]);
  useEffect(() => {
    if (initialProduct) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lifts = useMemo(() => Object.fromEntries(stats.map((s) => [s.id, s.lift])), [stats]);
  const candidates = useMemo(() => {
    const ids = new Set([...initialGenes, ...stats.filter((s) => s.lift > 1.05).slice(0, 14).map((s) => s.id)]);
    return stats.filter((s) => ids.has(s.id));
  }, [stats, initialGenes]);

  const body = (p: string, c: string) => ({
    niche,
    product: p,
    creator: c || "you",
    audience,
    style,
    genes,
    lifts,
    trendingSound,
    source: source ? { id: source.id, duration: source.duration, transcript: [], frames: [], audio: source.audio, handle: source.handle } : undefined,
  });

  const generate = async () => {
    if (!product.trim()) return;
    setBusy(true);
    setPlan(await forkPlan(body(product.trim(), creator.trim())));
    setBusy(false);
  };

  const generateRoster = async () => {
    setBusy(true);
    const rows = roster.split("\n").map((l) => l.split(",").map((x) => x.trim())).filter((r) => r[0] && r[1]);
    const plans = await Promise.all(rows.map(([c, p]) => forkPlan(body(p, c))));
    setRosterPlans(plans);
    setBusy(false);
  };

  const md = plan ? toMarkdown(plan, stats) : "";
  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const download = (text: string, name: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
    a.download = name;
    a.click();
  };
  const label = (id: string) => stats.find((s) => s.id === id)?.label || id;
  const track = (id: string) => stats.find((s) => s.id === id)?.track || "format";

  return (
    <motion.div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="max-w-6xl mx-auto my-6 sm:my-10 px-3 sm:px-4" initial={{ y: 24 }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()}>
        <div className="card bg-panel p-4 sm:p-6 print:p-0">
          <div className="flex items-center justify-between gap-3 no-print">
            <div>
              <div className="text-xs mono text-muted">FORK · structure inherited, content original</div>
              <h3 className="text-2xl font-semibold mt-1 flex items-center gap-2"><GitFork className="text-lime" size={22} /> {source ? `Fork @${source.handle}'s structure` : `Fork the winning “${niche}” genome`}</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-xl border border-line p-1 text-sm">
                <button onClick={() => setMode("single")} className={`px-3 py-1.5 rounded-lg ${mode === "single" ? "bg-panel2 text-ink" : "text-muted"}`}>One creator</button>
                <button onClick={() => setMode("roster")} className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${mode === "roster" ? "bg-panel2 text-ink" : "text-muted"}`}><Users size={14} /> Agency roster</button>
              </div>
              <button onClick={onClose} className="p-2 text-muted hover:text-ink" aria-label="Close"><X size={20} /></button>
            </div>
          </div>

          <div className="mt-5 grid lg:grid-cols-[340px_1fr] gap-6">
            <div className="space-y-4 no-print">
              {mode === "single" ? (
                <>
                  <Field label="What's your video about?" value={product} onChange={setProduct} placeholder="e.g. my oat-milk cold brew" autoFocus />
                  <Field label="Your handle" value={creator} onChange={setCreator} placeholder="@you" />
                  <Field label="Audience (optional)" value={audience} onChange={setAudience} placeholder="busy founders, gym beginners…" />
                </>
              ) : (
                <div>
                  <label className="text-xs mono text-muted">ROSTER · one per line: handle, product</label>
                  <textarea value={roster} onChange={(e) => setRoster(e.target.value)} rows={7} className="mt-1.5 w-full bg-panel2 border border-line rounded-xl px-3 py-2.5 text-sm mono outline-none focus:border-lime/60" />
                </div>
              )}
              <div>
                <label className="text-xs mono text-muted">STYLE</label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {(["face", "hands", "faceless"] as const).map((s) => (
                    <button key={s} onClick={() => setStyle(s)} className={`text-sm rounded-xl border px-2 py-2 capitalize ${style === s ? "border-lime text-ink bg-lime/10" : "border-line text-muted"}`}>{s === "face" ? "Face cam" : s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs mono text-muted">INHERITED GENES ({genes.length})</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-56 overflow-y-auto scroll-thin">
                  {candidates.map((g) => {
                    const on = genes.includes(g.id);
                    return (
                      <button key={g.id} onClick={() => setGenes(on ? genes.filter((x) => x !== g.id) : [...genes, g.id])} className={`text-xs rounded-full border px-2.5 py-1 flex items-center gap-1.5 transition ${on ? "text-ink" : "text-muted border-line opacity-60"}`} style={on ? { borderColor: TRACK_COLOR[g.track], background: TRACK_COLOR[g.track] + "1a" } : undefined}>
                        {on && <Check size={11} />} {g.label} <span className="mono opacity-70">{g.lift.toFixed(1)}×</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <button onClick={mode === "single" ? generate : generateRoster} disabled={busy || !genes.length || (mode === "single" && !product.trim())} className="w-full grad-bg text-black font-semibold rounded-xl py-3 flex items-center justify-center gap-2 disabled:opacity-40">
                {busy ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />} {mode === "single" ? "Generate shot list" : `Fork for ${roster.split("\n").filter((l) => l.includes(",")).length} creators`}
              </button>
            </div>

            <div className="min-w-0">
              {mode === "single" && !plan && <Empty />}
              {mode === "single" && plan && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xl font-semibold">{plan.title}</h4>
                      <div className="text-sm text-muted mt-0.5">@{plan.creator.replace(/^@/, "")} · {plan.duration}s · engine: <span className="mono">{plan.engine}</span></div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-semibold grad-text">{plan.predictedLift}×</div>
                      <div className="text-[11px] text-muted mono">genome lift score · a prior, not a promise</div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {plan.beats.map((b, i) => (
                      <motion.div key={b.slot} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="rounded-2xl border border-line bg-panel2/60 p-4 grid sm:grid-cols-[90px_1fr] gap-3">
                        <div>
                          <div className="text-sm font-bold tracking-wide grad-text">{b.slot}</div>
                          <div className="text-xs mono text-muted">{fmtT(b.start)}–{fmtT(b.end)}</div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-x-5 gap-y-2 text-sm">
                          <Row k="Shot" v={b.shot} c="#d9f99d" />
                          <Row k="Say" v={b.say} c="#f9a8d4" />
                          <Row k="On-screen" v={b.onscreen} c="#7dd3fc" />
                          <Row k="Sound" v={b.sound} c="#fcd34d" />
                          <div className="md:col-span-2 flex flex-wrap items-center gap-1.5 pt-1">
                            {b.genes.map((g) => (
                              <span key={g} className="text-[11px] rounded-full px-2 py-0.5 border" style={{ borderColor: TRACK_COLOR[track(g)], color: TRACK_COLOR[track(g)] }}>inherits · {label(g)}</span>
                            ))}
                            <span className="text-[11px] rounded-full px-2 py-0.5 border border-line text-muted">swapped · {b.swapped}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-2xl border border-line p-4 text-sm">
                    <span className="text-muted mono text-xs">CAPTION</span>
                    <p className="mt-1">{plan.caption} <span className="text-sky">{plan.hashtags.map((h) => "#" + h).join(" ")}</span></p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 no-print">
                    <button onClick={() => copy(md)} className="flex items-center gap-1.5 text-sm border border-line rounded-xl px-3.5 py-2 hover:border-ink/40">{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy as Markdown"}</button>
                    <button onClick={() => download(md, `helix-fork-${plan.product.replace(/\W+/g, "-")}.md`)} className="flex items-center gap-1.5 text-sm border border-line rounded-xl px-3.5 py-2 hover:border-ink/40"><Download size={15} /> Download .md</button>
                    <button onClick={() => window.print()} className="flex items-center gap-1.5 text-sm border border-line rounded-xl px-3.5 py-2 hover:border-ink/40"><Printer size={15} /> Print shot list</button>
                  </div>
                </div>
              )}
              {mode === "roster" && !rosterPlans.length && <Empty roster />}
              {mode === "roster" && !!rosterPlans.length && (
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold">{rosterPlans.length} shot lists, one genome</h4>
                    <button onClick={() => download(rosterPlans.map((p) => toMarkdown(p, stats)).join("\n\n---\n\n"), `helix-roster-${niche.replace(/\W+/g, "-")}.md`)} className="flex items-center gap-1.5 text-sm border border-line rounded-xl px-3.5 py-2 hover:border-ink/40 no-print"><Download size={15} /> Export all</button>
                  </div>
                  <div className="mt-4 grid md:grid-cols-2 gap-3">
                    {rosterPlans.map((p, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="rounded-2xl border border-line bg-panel2/60 p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">@{p.creator.replace(/^@/, "")}</span>
                          <span className="text-sm mono grad-text font-semibold">{p.predictedLift}×</span>
                        </div>
                        <div className="text-xs text-muted mt-0.5">{p.product} · {p.duration}s</div>
                        <ol className="mt-3 space-y-1.5 text-sm">
                          {p.beats.map((b) => (
                            <li key={b.slot}><span className="mono text-[11px] text-lime mr-1.5">{b.slot}</span>{b.say}</li>
                          ))}
                        </ol>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, value, onChange, placeholder, autoFocus }: { label: string; value: string; onChange: (s: string) => void; placeholder?: string; autoFocus?: boolean }) {
  return (
    <div>
      <label className="text-xs mono text-muted uppercase">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} className="mt-1.5 w-full bg-panel2 border border-line rounded-xl px-3.5 py-2.5 outline-none focus:border-lime/60" />
    </div>
  );
}
function Row({ k, v, c }: { k: string; v: string; c: string }) {
  return (
    <div>
      <div className="text-[10px] mono uppercase" style={{ color: c }}>{k}</div>
      <div className="text-ink/90 leading-snug">{v}</div>
    </div>
  );
}
function Empty({ roster }: { roster?: boolean }) {
  return (
    <div className="h-full min-h-72 rounded-2xl border border-dashed border-line grid place-items-center text-center p-8">
      <div>
        <GitFork className="mx-auto text-muted" />
        <p className="mt-3 text-muted max-w-sm">{roster ? "Paste your roster and Helix forks the same proven genome into a shot list for every creator — Monday's briefs in one click." : "Tell Helix what your video is about. It keeps the genes that lift views in this niche and swaps in your content."}</p>
      </div>
    </div>
  );
}
