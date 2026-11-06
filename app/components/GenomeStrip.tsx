"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, GitFork, X } from "lucide-react";
import type { GeneStat, SlimVideo, Track } from "@/lib/types";
import { TRACK_COLOR, TRACK_LABEL, Thumb, fmt, fmtT } from "./ui";

const GENE_TRACK = (id: string): Track =>
  id.startsWith("vis.") ? "visual" : id.startsWith("text.") ? "onscreen" : id.startsWith("sound.") ? "sound" : id.startsWith("len.") || id.startsWith("caption.") || id.startsWith("tags.") ? "format" : "spoken";

export function VideoGenome({ v, stats, onClose, onFork }: { v: SlimVideo; stats: GeneStat[]; onClose: () => void; onFork: (v: SlimVideo) => void }) {
  const dur = Math.max(v.duration || 0, ...v.transcript.map((t) => t.e), ...v.frames.map((f) => f.t + 1), 1);
  const [hover, setHover] = useState<number | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const frame = v.frames[frameIdx];
  const statById = useMemo(() => Object.fromEntries(stats.map((s) => [s.id, s])), [stats]);
  const pct = (t: number) => `${Math.min(100, Math.max(0, (t / dur) * 100))}%`;
  const tracks: Track[] = ["visual", "spoken", "onscreen", "sound", "format"];

  return (
    <motion.div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="max-w-6xl mx-auto my-6 sm:my-10 px-3 sm:px-4" initial={{ y: 24 }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()}>
        <div className="card bg-panel p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs mono text-muted">VIDEO GENOME · {v.platform.toUpperCase()} · {new Date(v.publishedAt).toLocaleDateString()}</div>
              <h3 className="text-xl sm:text-2xl font-semibold mt-1 truncate">@{v.handle}</h3>
              <div className="text-sm text-muted mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span><b className="text-ink">{fmt(v.views)}</b> views</span>
                <span><b className="text-ink">{fmt(v.followers)}</b> followers</span>
                <span><b className="text-lime">{v.vrf.toFixed(0)}%</b> views/follower</span>
                <span><b className="text-ink">{v.er.toFixed(1)}%</b> engagement</span>
                <span><b className="text-ink">{v.duration.toFixed(0)}s</b></span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {v.link !== "#" && (
                <a href={v.link} target="_blank" rel="noreferrer" className="hidden sm:flex items-center gap-1.5 text-sm border border-line rounded-xl px-3 py-2 hover:border-ink/40">
                  Open <ExternalLink size={14} />
                </a>
              )}
              <button onClick={() => onFork(v)} className="flex items-center gap-1.5 text-sm grad-bg text-black font-semibold rounded-xl px-3.5 py-2">
                <GitFork size={15} /> Fork structure
              </button>
              <button onClick={onClose} className="p-2 text-muted hover:text-ink" aria-label="Close"><X size={20} /></button>
            </div>
          </div>

          <div className="mt-6 grid lg:grid-cols-[220px_1fr] gap-6">
            {/* Frame viewer with OCR polygons */}
            <div>
              <Thumb src={frame?.url || v.thumb} seed={v.id + frameIdx} className="aspect-[9/16] rounded-2xl border border-line">
                <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                  {frame?.texts.map((t, i) => (
                    <polygon key={i} points={t.poly.map((p) => `${p.x},${p.y}`).join(" ")} fill="rgba(125,211,252,0.18)" stroke="#7dd3fc" strokeWidth={0.006} />
                  ))}
                </svg>
                {frame && !frame.url && !v.thumb && (
                  <div className="absolute inset-x-3 top-[12%] space-y-2">
                    {frame.texts.map((t, i) => (
                      <div key={i} className="text-[11px] font-bold text-white bg-black/50 rounded px-1.5 py-0.5 text-center">{t.text}</div>
                    ))}
                  </div>
                )}
                <div className="absolute bottom-2 left-2 text-[11px] mono bg-black/60 rounded px-1.5 py-0.5">{frame ? fmtT(frame.t) : "0:00"}</div>
                {frame?.vis?.map((x, i) => (
                  <div key={i} className="absolute right-2 text-[10px] mono bg-black/70 rounded px-1.5 py-0.5 text-lime" style={{ top: 8 + i * 20 }}>{x.gene.replace("vis.", "")} {(x.score * 100).toFixed(0)}%</div>
                ))}
              </Thumb>
              <div className="text-[11px] text-muted mt-2 mono">Frame {frameIdx + 1}/{Math.max(1, v.frames.length)} · OCR regions outlined</div>
            </div>

            {/* Genome strip */}
            <div className="min-w-0">
              <div className="relative">
                {/* time ruler */}
                <div className="ml-24 relative h-5 text-[10px] mono text-muted">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <span key={i} className="absolute -translate-x-1/2" style={{ left: `${(i / 5) * 100}%` }}>{fmtT((i / 5) * dur)}</span>
                  ))}
                </div>
                <div className="space-y-2">
                  {tracks.map((tr) => (
                    <div key={tr} className="flex items-center gap-2">
                      <div className="w-22 shrink-0 text-xs font-medium" style={{ color: TRACK_COLOR[tr] }}>{TRACK_LABEL[tr]}</div>
                      <div className="relative flex-1 h-12 rounded-xl bg-panel2 border border-line overflow-hidden">
                        {tr === "visual" &&
                          v.frames.map((f, i) => (
                            <button
                              key={i}
                              onClick={() => setFrameIdx(i)}
                              onMouseEnter={() => setFrameIdx(i)}
                              className={`absolute top-1 bottom-1 rounded-md overflow-hidden border ${i === frameIdx ? "border-lime" : "border-transparent"}`}
                              style={{ left: pct(f.t), width: `max(18px, ${100 / Math.max(6, v.frames.length + 1)}%)` }}
                              aria-label={`Frame at ${fmtT(f.t)}`}
                            >
                              <Thumb src={f.url} seed={v.id + i} className="w-full h-full">
                                {!!f.vis?.length && <span className="absolute inset-x-0 bottom-0 h-1 bg-lime" />}
                              </Thumb>
                            </button>
                          ))}
                        {tr === "spoken" &&
                          (v.transcript.length ? (
                            v.transcript.map((c, i) => (
                              <div
                                key={i}
                                onMouseEnter={() => setHover(i)}
                                onMouseLeave={() => setHover(null)}
                                className="absolute top-1.5 bottom-1.5 rounded-md px-1.5 text-[10px] leading-tight text-black overflow-hidden cursor-default"
                                style={{ left: pct(c.s), width: `calc(${pct(Math.max(0.4, c.e - c.s))} - 2px)`, background: i === 0 ? "#f9a8d4" : "rgba(249,168,212,0.55)" }}
                                title={`${fmtT(c.s)} “${c.text}”`}
                              >
                                {c.text}
                              </div>
                            ))
                          ) : (
                            <div className="absolute inset-0 grid place-items-center text-xs text-muted">no speech</div>
                          ))}
                        {tr === "onscreen" &&
                          v.frames.map((f, i) =>
                            f.texts.length ? (
                              <div key={i} className="absolute top-1.5 bottom-1.5 rounded-md px-1 text-[10px] leading-tight text-black overflow-hidden" style={{ left: pct(f.t), width: `max(14px, ${100 / Math.max(6, v.frames.length + 1)}%)`, background: "rgba(125,211,252,0.8)" }} title={f.texts.map((t) => t.text).join(" / ")}>
                                {f.texts[0].text}
                              </div>
                            ) : null,
                          )}
                        {tr === "sound" && (
                          <div className="absolute inset-1 rounded-md flex items-center gap-2 px-2 text-xs" style={{ background: "rgba(252,211,77,0.14)" }}>
                            <div className="flex items-end gap-[2px] h-6">
                              {Array.from({ length: 48 }).map((_, i) => (
                                <span key={i} className="w-[3px] rounded-sm" style={{ height: `${20 + Math.abs(Math.sin(i * 1.7 + v.id.length)) * 80}%`, background: "#fcd34d", opacity: 0.7 }} />
                              ))}
                            </div>
                            <span className="truncate text-amber">{v.audio.original ? "Original sound" : v.audio.title || "Unknown track"}{v.audio.author && !v.audio.original ? ` — ${v.audio.author}` : ""}</span>
                          </div>
                        )}
                        {tr === "format" && (
                          <div className="absolute inset-1 rounded-md flex items-center gap-3 px-2 text-xs text-violet" style={{ background: "rgba(196,181,253,0.12)" }}>
                            <span>{v.duration.toFixed(0)}s</span>
                            <span className="text-muted">·</span>
                            <span>{v.hashtags.length} hashtags</span>
                            <span className="text-muted">·</span>
                            <span className="truncate text-muted">{v.caption.slice(0, 80)}</span>
                          </div>
                        )}
                        {/* gene markers */}
                        {v.genes
                          .filter((g) => GENE_TRACK(g.id) === tr && g.t !== undefined && tr !== "visual")
                          .map((g, i) => (
                            <span key={i} className="absolute -top-0 w-[2px] h-full" style={{ left: pct(g.t || 0), background: TRACK_COLOR[tr] }} />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
                {hover !== null && v.transcript[hover] && (
                  <div className="mt-3 text-sm text-pink">“{v.transcript[hover].text}” <span className="text-muted mono text-xs">@ {fmtT(v.transcript[hover].s)}</span></div>
                )}
              </div>

              {/* Gene list */}
              <div className="mt-6">
                <div className="text-xs mono text-muted mb-2">{v.genes.length} GENES DETECTED · each read from an Oriane field</div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {v.genes.map((g, i) => {
                    const tr = GENE_TRACK(g.id);
                    const s = statById[g.id];
                    return (
                      <div key={i} className="rounded-xl border border-line bg-panel2/60 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: TRACK_COLOR[tr] }} />
                            {s?.label || g.id}
                          </span>
                          {s && <span className={`text-xs mono ${s.lift >= 1 ? "text-lime" : "text-red-300"}`}>{s.lift.toFixed(1)}× in niche</span>}
                        </div>
                        <div className="text-xs text-muted mt-1 truncate" title={g.evidence}>{g.evidence}</div>
                        <div className="text-[10px] mono text-muted/70 mt-0.5">{g.field}{g.t !== undefined ? ` · ${fmtT(g.t)}` : ""}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
