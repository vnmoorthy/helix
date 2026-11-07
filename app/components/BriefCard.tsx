"use client";
import { motion } from "framer-motion";
import { Cpu, Ban, Zap, Quote } from "lucide-react";
import type { Brief } from "@/lib/types";

export function BriefCard({ brief, llm }: { brief: Brief | null | undefined; llm: string | null }) {
  if (brief === null) return null;
  return (
    <section className="mt-8 card p-5 sm:p-7 relative overflow-hidden">
      <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-pink/10 blur-3xl pointer-events-none" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs mono text-muted">AI GENOME BRIEF · written only from the measured lift data above</div>
        <span className="inline-flex items-center gap-1.5 text-xs mono rounded-full border border-violet/40 text-violet px-2.5 py-1">
          <Cpu size={12} /> {brief?.via || llm || "GMI Cloud"}
        </span>
      </div>
      {brief === undefined ? (
        <div className="mt-4 space-y-3 animate-pulse">
          <div className="h-7 w-3/4 rounded-lg bg-panel2" />
          <div className="h-4 w-full rounded bg-panel2" />
          <div className="h-4 w-5/6 rounded bg-panel2" />
          <div className="text-xs mono text-muted">GMI Cloud is reading the genome…</div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">{brief.headline}</h2>
          <div className="mt-6 grid lg:grid-cols-[1.4fr_1fr] gap-6">
            <div>
              <div className="text-xs mono text-lime flex items-center gap-1.5"><Zap size={13} /> DO THIS WEEK</div>
              <ol className="mt-2 space-y-2.5">
                {brief.moves.map((m, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span className="mono text-xs text-black grad-bg rounded-full w-5 h-5 grid place-items-center shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-ink/90">{m}</span>
                  </li>
                ))}
              </ol>
              {brief.avoid && (
                <div className="mt-4 rounded-xl border border-red-300/25 bg-red-300/5 px-3.5 py-2.5 text-sm flex gap-2.5">
                  <Ban size={16} className="text-red-300 shrink-0 mt-0.5" />
                  <span className="text-ink/85">{brief.avoid}</span>
                </div>
              )}
            </div>
            <div>
              <div className="text-xs mono text-pink flex items-center gap-1.5"><Quote size={13} /> HOOKS THAT FIT THE GENOME</div>
              <div className="mt-2 space-y-2">
                {brief.hooks.map((h, i) => (
                  <div key={i} className="rounded-xl border border-line bg-panel2/60 px-3.5 py-2.5 text-sm">“{h}”</div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </section>
  );
}
