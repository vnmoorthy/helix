"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Search, Eye, Mic, Type, Music2, Dna, GitFork, BarChart3, Database } from "lucide-react";
import { HelixArt, KeyModal, Logo, StatusPill, useStatus } from "@/components/ui";
import { nicheHref } from "@/lib/client";

const EXAMPLES = ["protein coffee", "skincare routine", "ai tools", "home workout", "meal prep", "travel hacks"];

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [keyOpen, setKeyOpen] = useState(false);
  const { status, reload } = useStatus();
  const go = (term: string) => term.trim() && router.push(nicheHref(term.trim()));

  return (
    <main className="relative z-10 min-h-screen">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-3">
          <a href="https://github.com/vnmoorthy/helix" target="_blank" className="hidden sm:inline text-sm text-muted hover:text-ink">GitHub</a>
          <StatusPill status={status} onConnect={() => setKeyOpen(true)} />
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-20 grid lg:grid-cols-[1.25fr_0.75fr] gap-10 items-center">
        <div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 text-xs mono text-muted border border-line rounded-full px-3 py-1.5 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" /> Built on Oriane video intelligence · TikTok + Instagram
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-5xl sm:text-7xl font-semibold tracking-[-0.04em] leading-[0.95]">
            Every viral video
            <br />
            has a <span className="grad-text">genome.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-6 text-lg sm:text-xl text-muted max-w-2xl leading-relaxed">
            Helix reads what short-form videos <b className="text-ink font-medium">show</b>, <b className="text-ink font-medium">say</b>, <b className="text-ink font-medium">overlay</b> and <b className="text-ink font-medium">sound like</b>, measures which of those genes actually lift views in your niche, and forks the winning structure into a shot list you can film on Monday.
          </motion.p>

          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={(e) => {
              e.preventDefault();
              go(q);
            }}
            className="mt-9 glow rounded-2xl bg-panel border border-line p-2 flex items-center gap-2 max-w-2xl"
          >
            <Search className="ml-3 text-muted shrink-0" size={20} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sequence a niche… e.g. protein coffee" className="flex-1 bg-transparent outline-none text-lg py-3 min-w-0" aria-label="Niche" />
            <button type="submit" className="grad-bg text-black font-semibold rounded-xl px-5 py-3 flex items-center gap-2 hover:brightness-110 transition shrink-0">
              Sequence <ArrowRight size={18} />
            </button>
          </motion.form>
          <div className="mt-4 flex flex-wrap gap-2 max-w-2xl">
            {EXAMPLES.map((e) => (
              <button key={e} onClick={() => go(e)} className="text-sm rounded-full border border-line px-3.5 py-1.5 text-muted hover:text-ink hover:border-lime/50 transition">
                {e}
              </button>
            ))}
          </div>
          {!!status?.cached?.length && (
            <div className="mt-8 max-w-2xl">
              <div className="text-xs mono text-muted mb-2 flex items-center gap-1.5"><Database size={12} /> Sequenced from live Oriane data — open instantly</div>
              <div className="flex flex-wrap gap-2">
                {status.cached.slice(0, 8).map((c) => (
                  <button key={c.slug} onClick={() => go(c.q)} className="text-sm rounded-lg bg-panel2 border border-line px-3 py-1.5 hover:border-sky/50 transition">
                    {c.q} <span className="text-muted mono text-xs">· {c.n} videos</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="hidden lg:block h-[540px]">
          <HelixArt className="h-full mx-auto max-w-[260px]" />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Eye, c: "#d9f99d", t: "Shows", d: "AI-Vision probes find face-cam, hands-on-product, screen recordings, before/after — at the exact frame." },
            { icon: Mic, c: "#f9a8d4", t: "Says", d: "Timestamped transcripts expose the hook: questions, listicles, contrarian openers, time-to-first-word, pace." },
            { icon: Type, c: "#7dd3fc", t: "Overlays", d: "On-screen text regions with polygons: text hooks in frame one, burned-in captions, ALL-CAPS, POV lines." },
            { icon: Music2, c: "#fcd34d", t: "Sounds like", d: "Original audio vs licensed tracks, and which sounds are trending across the niche right now." },
          ].map((f, i) => (
            <motion.div key={f.t} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="card p-5">
              <f.icon size={20} style={{ color: f.c }} />
              <div className="mt-3 font-semibold">{f.t}</div>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">{f.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <div className="card p-6 sm:p-10 grid md:grid-cols-3 gap-8">
          {[
            { icon: Dna, t: "1 · Sequence", d: "Pull the hits and the long tail of a niche from Oriane — found by what's said, overlaid and captioned, then probed by AI Vision — and extract 32 genes per video, each with a timestamp and source field." },
            { icon: BarChart3, t: "2 · Measure lift", d: "For every gene: median views-per-follower with vs. without it, and its share of top- vs. bottom-quartile videos. The winning genome is what the data says, not what a guru says." },
            { icon: GitFork, t: "3 · Fork", d: "Inherit the structure, never the content. Helix turns the winning genome into a 4-beat shot list for your product — or batch-forks it across your whole creator roster." },
          ].map((s) => (
            <div key={s.t}>
              <s.icon className="text-lime" size={22} />
              <div className="mt-3 text-lg font-semibold">{s.t}</div>
              <p className="mt-2 text-muted leading-relaxed text-sm">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 pb-10 text-xs text-muted mono flex flex-wrap gap-x-6 gap-y-2 justify-between">
        <span>Helix · built at Hack the Feed, Amplitude HQ SF · Nov 6 2026</span>
        <span>Data: Oriane video intelligence API</span>
      </footer>
      <KeyModal open={keyOpen} onClose={() => setKeyOpen(false)} onSaved={reload} />
    </main>
  );
}
