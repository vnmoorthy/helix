"use client";
// Client data layer. Two modes:
//  - server (default): calls the Next.js route handlers, which call Oriane live.
//  - static (NEXT_PUBLIC_STATIC=1, GitHub Pages): reads niches pre-sequenced from live
//    Oriane data as JSON, runs the fork engine in the browser, never ships an API key.
import type { Brief, ForkPlan, NicheReport } from "./types";
import type { ForkInput } from "./fork";

export const STATIC = process.env.NEXT_PUBLIC_STATIC === "1";
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export type Status = {
  oriane: boolean;
  llm: string | null;
  hosted?: boolean;
  static?: boolean;
  cached: { q: string; slug: string; n: number; fetchedAt: string }[];
};

const slug = (q: string) => q.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "niche";

export async function getStatus(): Promise<Status> {
  if (STATIC) {
    const cached = await fetch(`${BASE}/data/index.json`).then((r) => r.json()).catch(() => []);
    return { oriane: false, llm: null, hosted: true, static: true, cached };
  }
  return fetch("/api/status").then((r) => r.json());
}

export async function getNiche(q: string, fresh = false): Promise<NicheReport> {
  if (STATIC) {
    const r = await fetch(`${BASE}/data/${slug(q)}.json`);
    if (r.ok) return r.json();
    const [{ sampleCorpus }, { analyze }] = await Promise.all([import("./sample"), import("./genes")]);
    return analyze(q, sampleCorpus(q), "sample", [
      `“${q}” hasn't been sequenced for this static GitHub Pages edition, so this is a synthetic sample. Live Oriane sequencing of any niche runs in the server version (npm run dev with ORIANE_API_KEY, or Deploy with Vercel).`,
    ]);
  }
  const r = await fetch(`/api/niche?q=${encodeURIComponent(q)}${fresh ? "&fresh=1" : ""}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Failed");
  return j;
}

export async function forkPlan(body: ForkInput): Promise<ForkPlan> {
  if (STATIC) {
    const { templateFork } = await import("./fork");
    return templateFork({ ...body, creator: body.creator || "you", niche: body.niche || "your niche" });
  }
  return fetch("/api/fork", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
}

export async function getBrief(report: NicheReport): Promise<Brief | null> {
  if (STATIC || report.brief !== undefined) return report.brief ?? null;
  if (report.source === "sample") return null;
  const j = await fetch(`/api/brief?q=${encodeURIComponent(report.query)}`).then((r) => r.json()).catch(() => null);
  return j?.brief ?? null;
}

export const nicheHref = (q: string) => `/n?q=${encodeURIComponent(q)}`;
