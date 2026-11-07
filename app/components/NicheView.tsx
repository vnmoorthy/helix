"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, GitFork, RefreshCw, Search, Sparkles, Info, Eye, Mic, Type, Hash, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import type { GeneStat, NicheReport, SlimVideo, Track } from "@/lib/types";
import { KeyModal, Logo, SourceBadge, StatusPill, TRACK_COLOR, TRACK_FIELD, TRACK_LABEL, Thumb, fmt, useStatus } from "./ui";
import { VideoGenome } from "./GenomeStrip";
import { ForkPanel } from "./ForkPanel";
import { getNiche, nicheHref } from "@/lib/client";

const STEPS = [
  "Querying Oriane: what's said, overlaid & captioned",
  "Pulling the hits + the long tail, with frames, transcripts & OCR",
  "Running AI-Vision probes frame by frame",
  "Extracting 32 genes per video",
  "Measuring lift: with vs. without each gene",
];

export function NicheView({ q }: { q: string }) {
  const router = useRouter();
  const [data, setData] = useState<NicheReport | null>(null);
  const [err, setErr] = useState("");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [geneFilter, setGeneFilter] = useState<string | null>(null);
  const [trackFilter, setTrackFilter] = useState<Track | "all">("all");
  const [open, setOpen] = useState<SlimVideo | null>(null);
  const [fork, setFork] = useState<{ genes: string[]; source?: SlimVideo | null; product?: string; creator?: string } | null>(null);
  const [keyOpen, setKeyOpen] = useState(false);
  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);
  const { status, reload } = useStatus();

  const load = async (fresh = false) => {
    setLoading(true);
    setErr("");
    setStep(0);
    const iv = setInterval(() => setStep((s) => Math.min(STEPS.length - 1, s + 1)), fresh ? 7000 : 600);
    try {
      const j = await getNiche(q, fresh);
      setData(j);
      // deep links: ?video=<id|top> opens a genome, ?fork=1 opens the fork panel, ?gene=<id> filters
      const sp = new URLSearchParams(window.location.search);
      const rep = j as NicheReport;
      const vid = sp.get("video");
      if (vid) {
        const metric = (v: SlimVideo) => (rep.metric === "views/follower" ? v.vrf : v.views);
        const v = vid === "top" ? rep.corpus.slice().sort((a, b) => metric(b) - metric(a))[0] : rep.corpus.find((x) => x.id === vid);
        if (v) setOpen(v);
      }
      if (sp.get("gene")) setGeneFilter(sp.get("gene"));
      if (sp.get("fork")) setFork({ genes: rep.winning.map((g) => g.id), product: sp.get("product") || undefined, creator: sp.get("creator") || undefined });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      clearInterval(iv);
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const byId = useMemo(() => new Map((data?.corpus || []).map((v) => [v.id, v])), [data]);
  const wall = useMemo(() => {
    if (!data) return [];
    let vs = data.corpus.slice().sort((a, b) => b.views - a.views);
    if (geneFilter) vs = vs.filter((v) => v.genes.some((g) => g.id === geneFilter));
    return vs.slice(0, 36);
  }, [data, geneFilter]);
  const trending = useMemo(() => {
    if (!data) return undefined;
    const c = new Map<string, number>();
    data.corpus.forEach((v) => v.genes.some((g) => g.id === "sound.trending") && c.set(v.audio.title, (c.get(v.audio.title) || 0) + 1));
    return [...c].sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [data]);

  const genes = (data?.genes || []).filter((g) => trackFilter === "all" || g.track === trackFilter);
  const maxLift = Math.max(2, ...(data?.genes || []).map((g) => g.lift));
  const activeGene = data?.genes.find((g) => g.id === geneFilter);

  return (
    <main className="relative z-10 min-h-screen pb-24">
      <nav className="sticky top-0 z-30 backdrop-blur-xl bg-bg/70 border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Logo size={24} />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (search.trim()) router.push(nicheHref(search.trim()));
            }}
            className="flex-1 max-w-md mx-auto hidden sm:flex items-center gap-2 bg-panel border border-line rounded-xl px-3 py-1.5"
          >
            <Search size={16} className="text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent outline-none text-sm flex-1" aria-label="Search niche" />
          </form>
          <StatusPill status={status} onConnect={() => setKeyOpen(true)} />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        <button onClick={() => router.push("/")} className="text-sm text-muted hover:text-ink flex items-center gap-1.5"><ArrowLeft size={15} /> All niches</button>

        {loading && (
          <div className="mt-10 card p-8 sm:p-12 max-w-2xl">
            <div className="text-xs mono text-muted">SEQUENCING</div>
            <h2 className="text-4xl font-semibold mt-2 tracking-tight">“{q}”</h2>
            <div className="mt-8 space-y-3">
              {STEPS.map((s, i) => (
                <motion.div key={s} initial={{ opacity: 0.3 }} animate={{ opacity: i <= step ? 1 : 0.3 }} className="flex items-center gap-3 text-sm">
                  <span className={`w-2 h-2 rounded-full ${i < step ? "bg-lime" : i === step ? "bg-pink animate-pulse" : "bg-line"}`} />
                  {s}
                </motion.div>
              ))}
            </div>
          </div>
        )}
        {err && !loading && (
          <div className="mt-10 card p-8 text-red-300">
            {err} <button onClick={() => load()} className="ml-3 underline">Retry</button>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Header */}
            <header className="mt-5 flex flex-wrap items-end justify-between gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <SourceBadge source={data.source} fetchedAt={data.fetchedAt} />
                  <span className="text-xs mono text-muted">metric: {data.metric}</span>
                </div>
                <h1 className="text-4xl sm:text-6xl font-semibold tracking-[-0.03em] mt-3">
                  The <span className="grad-text">{q}</span> genome
                </h1>
              </div>
              <div className="flex items-center gap-2">
                {status?.oriane && (
                  <button onClick={() => load(true)} className="flex items-center gap-1.5 text-sm border border-line rounded-xl px-3.5 py-2.5 hover:border-ink/40"><RefreshCw size={15} /> Re-sequence live</button>
                )}
                <button onClick={() => setFork({ genes: data.winning.map((g) => g.id) })} className="flex items-center gap-2 grad-bg text-black font-semibold rounded-xl px-4 py-2.5"><GitFork size={17} /> Fork winning genome</button>
              </div>
            </header>

            {/* KPIs */}
            <section className="mt-7 grid grid-cols-2 lg:grid-cols-5 gap-3">
              <Kpi k="Videos sequenced" v={String(data.corpus.length)} />
              <Kpi k="Total views" v={fmt(data.totalViews)} />
              <Kpi k="Median views" v={fmt(data.medianViews)} />
              <Kpi k="Genes measured" v={String(data.genes.length)} />
              <Kpi k="Invisible to caption search" v={`${data.signalCounts.hiddenShare}%`} accent tip="Videos Helix found only through what's said, shown on screen or seen — they never mention the niche in their caption." />
            </section>

            {/* Signal provenance */}
            <section className="mt-3 card p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span className="text-xs mono text-muted">FOUND BY ORIANE SIGNAL →</span>
              <Sig icon={Mic} c={TRACK_COLOR.spoken} k="said" n={data.signalCounts.said} />
              <Sig icon={Type} c={TRACK_COLOR.onscreen} k="on-screen text" n={data.signalCounts.onscreen} />
              {data.signalCounts.seen > 0 && <Sig icon={Eye} c={TRACK_COLOR.visual} k="seen (AI Vision)" n={data.signalCounts.seen} />}
              <Sig icon={Hash} c={TRACK_COLOR.format} k="caption" n={data.signalCounts.caption} />
              <span className="text-muted">A caption-only tool would have found <b className="text-ink">{data.signalCounts.caption}</b> of these <b className="text-ink">{data.signalCounts.total}</b>.</span>
            </section>

            {/* Winning genome */}
            <section className="mt-8 card glow p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs mono text-muted">THE WINNING GENOME</div>
                  <h2 className="text-2xl font-semibold mt-1">What the top videos in “{q}” share — and the bottom ones don't</h2>
                </div>
                <button onClick={() => setFork({ genes: data.winning.map((g) => g.id) })} className="flex items-center gap-2 text-sm border border-lime/50 text-lime rounded-xl px-3.5 py-2 hover:bg-lime/10"><Sparkles size={15} /> Turn into a shot list</button>
              </div>
              {data.winning.length === 0 ? (
                <p className="mt-4 text-muted">No gene shows a clear lift yet — try a broader niche or re-sequence.</p>
              ) : (
                <div className="mt-6 flex gap-3 overflow-x-auto scroll-thin pb-2">
                  {data.winning.map((g, i) => (
                    <motion.button
                      key={g.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      onClick={() => {
                        setGeneFilter(g.id);
                        document.getElementById("wall")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="min-w-[210px] max-w-[230px] text-left rounded-2xl border p-4 bg-panel2/70 hover:-translate-y-0.5 transition"
                      style={{ borderColor: TRACK_COLOR[g.track] + "66" }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] mono uppercase" style={{ color: TRACK_COLOR[g.track] }}>{TRACK_LABEL[g.track]}</span>
                        <span className="text-lg font-semibold" style={{ color: TRACK_COLOR[g.track] }}>{g.lift.toFixed(1)}×</span>
                      </div>
                      <div className="mt-2 font-semibold leading-tight">{g.label}</div>
                      <p className="mt-1.5 text-xs text-muted leading-relaxed">{g.recipe}</p>
                      <div className="mt-3 h-1.5 rounded-full bg-line overflow-hidden flex">
                        <span style={{ width: `${g.topShare}%`, background: TRACK_COLOR[g.track] }} />
                      </div>
                      <div className="mt-1.5 text-[11px] text-muted mono">{g.topShare}% of top vs {g.bottomShare}% of bottom quartile</div>
                    </motion.button>
                  ))}
                </div>
              )}
            </section>

            {/* Leaderboard + wall */}
            <section className="mt-8 grid lg:grid-cols-[420px_1fr] gap-6 items-start">
              <div className="card p-5 lg:sticky lg:top-20">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Gene leaderboard</h3>
                  <span className="text-[11px] mono text-muted">lift = median {data.metric} with ÷ without</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(["all", "visual", "spoken", "onscreen", "sound", "format"] as const).map((t) => (
                    <button key={t} onClick={() => setTrackFilter(t)} className={`text-xs rounded-full px-2.5 py-1 border ${trackFilter === t ? "text-black" : "text-muted border-line"}`} style={trackFilter === t ? { background: t === "all" ? "#f4f4ef" : TRACK_COLOR[t], borderColor: "transparent" } : undefined}>
                      {t === "all" ? "All" : TRACK_LABEL[t]}
                    </button>
                  ))}
                </div>
                <div className="mt-4 space-y-1 max-h-[640px] overflow-y-auto scroll-thin pr-1">
                  {genes.map((g) => (
                    <GeneRow key={g.id} g={g} max={maxLift} active={geneFilter === g.id} onClick={() => setGeneFilter(geneFilter === g.id ? null : g.id)} />
                  ))}
                </div>
                {trackFilter !== "all" && <div className="mt-3 text-[11px] mono text-muted">Source field: {TRACK_FIELD[trackFilter]}</div>}
              </div>

              <div id="wall" className="min-w-0 scroll-mt-24">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">
                    {activeGene ? (
                      <>
                        {wall.length} videos carry <span style={{ color: TRACK_COLOR[activeGene.track] }}>{activeGene.label}</span>{" "}
                        <span className="text-muted font-normal text-sm">· {activeGene.lift.toFixed(1)}× lift · {activeGene.share}% of niche</span>
                      </>
                    ) : (
                      <>Top videos by views</>
                    )}
                  </h3>
                  {geneFilter && <button onClick={() => setGeneFilter(null)} className="text-sm text-muted hover:text-ink">Clear filter ✕</button>}
                </div>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  <AnimatePresence mode="popLayout">
                    {wall.map((v, i) => (
                      <motion.button layout key={v.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ delay: Math.min(i, 12) * 0.02 }} onClick={() => setOpen(v)} className="text-left group">
                        <Thumb src={v.thumb || v.frames[0]?.url} seed={v.id} className="aspect-[9/14] rounded-2xl border border-line group-hover:border-lime/60 transition">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                          {!v.thumb && v.frames[0]?.texts[0] && <div className="absolute inset-x-3 top-[14%] text-[11px] font-bold text-white text-center bg-black/40 rounded px-1">{v.frames[0].texts[0].text}</div>}
                          <div className="absolute top-2 left-2 text-[10px] mono bg-black/60 rounded px-1.5 py-0.5">{v.platform === "tiktok" ? "TikTok" : v.platform === "instagram" ? "IG" : "YT"}</div>
                          <div className="absolute top-2 right-2 text-[10px] mono bg-lime text-black rounded px-1.5 py-0.5 font-semibold">{v.vrf >= 100 ? `${fmt(v.vrf / 100)}× reach` : `${v.vrf.toFixed(0)}% reach`}</div>
                          <Play className="absolute inset-0 m-auto opacity-0 group-hover:opacity-90 transition" size={34} />
                          <div className="absolute bottom-0 inset-x-0 p-2.5">
                            <div className="text-sm font-semibold flex items-center gap-1">▶ {fmt(v.views)}</div>
                            <div className="text-xs text-white/80 truncate">@{v.handle}</div>
                            <div className="mt-1.5 flex gap-1">
                              {(["visual", "spoken", "onscreen", "sound"] as Track[]).map((t) => {
                                const n = v.genes.filter((g) => data.genes.find((s) => s.id === g.id)?.track === t).length;
                                return <span key={t} className="h-1 flex-1 rounded-full" style={{ background: n ? TRACK_COLOR[t] : "#ffffff22" }} />;
                              })}
                            </div>
                          </div>
                        </Thumb>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
                {!wall.length && <p className="text-muted mt-6">No videos carry this gene.</p>}
              </div>
            </section>

            {!!data.notes.length && (
              <section className="mt-10 text-xs text-muted mono space-y-1">
                {data.notes.map((n, i) => (
                  <div key={i} className="flex gap-2"><Info size={13} className="shrink-0 mt-px" /> {n}</div>
                ))}
              </section>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {open && data && (
          <VideoGenome
            v={open}
            stats={data.genes}
            onClose={() => setOpen(null)}
            onFork={(v) => {
              const ids = new Set(data.genes.map((g) => g.id));
              setFork({ genes: [...new Set(v.genes.map((g) => g.id))].filter((id) => ids.has(id)), source: v });
              setOpen(null);
            }}
          />
        )}
        {fork && data && <ForkPanel niche={q} stats={data.genes} initialGenes={fork.genes} source={fork.source} trendingSound={trending} onClose={() => setFork(null)} initialProduct={fork.product} initialCreator={fork.creator} />}
      </AnimatePresence>
      <KeyModal open={keyOpen} onClose={() => setKeyOpen(false)} onSaved={() => { reload(); load(true); }} />
      {byId.size === 0 && null}
    </main>
  );
}

function Kpi({ k, v, accent, tip }: { k: string; v: string; accent?: boolean; tip?: string }) {
  return (
    <div className="card p-4" title={tip}>
      <div className="text-[11px] mono text-muted uppercase">{k}</div>
      <div className={`text-3xl font-semibold mt-1 ${accent ? "grad-text" : ""}`}>{v}</div>
    </div>
  );
}
function Sig({ icon: Icon, c, k, n }: { icon: typeof Mic; c: string; k: string; n: number }) {
  return (
    <span className="flex items-center gap-1.5"><Icon size={15} style={{ color: c }} /> <b>{n}</b> <span className="text-muted">{k}</span></span>
  );
}
function GeneRow({ g, max, active, onClick }: { g: GeneStat; max: number; active: boolean; onClick: () => void }) {
  const w = Math.min(100, (g.lift / max) * 100);
  const neg = g.lift < 1;
  return (
    <button onClick={onClick} className={`w-full text-left rounded-xl px-2.5 py-2 transition ${active ? "bg-panel2 ring-1 ring-lime/50" : "hover:bg-panel2/60"}`} title={g.blurb}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TRACK_COLOR[g.track] }} />
          <span className="truncate">{g.label}</span>
        </span>
        <span className={`mono text-xs shrink-0 ${neg ? "text-red-300" : "text-ink"}`}>{g.lift.toFixed(2)}× <span className="text-muted">· n={g.n}</span></span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-line overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ duration: 0.6 }} className="h-full rounded-full" style={{ background: neg ? "#fca5a5" : TRACK_COLOR[g.track] }} />
      </div>
    </button>
  );
}
