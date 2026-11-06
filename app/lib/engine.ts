import fs from "node:fs/promises";
import path from "node:path";
import { searchContents, createTextAsset, orianeKey, OrianeError, type ContentQuery, type ContentFilters } from "./oriane";
import { analyze, slim, VISUAL_PROBES } from "./genes";
import { sampleCorpus } from "./sample";
import type { NicheReport, SlimVideo } from "./types";

const CACHE_DIR = path.join(process.cwd(), "data", "cache");
const ASSET_FILE = path.join(process.cwd(), "data", "assets.json");

export const slug = (q: string) => q.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "niche";

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}
async function writeJson(file: string, data: unknown) {
  try {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(data));
  } catch {
    /* read-only FS (serverless) — fine */
  }
}

let assetMemo: Record<string, string> | null = null;
async function assetFor(text: string): Promise<string> {
  if (!assetMemo) assetMemo = (await readJson<Record<string, string>>(ASSET_FILE)) || {};
  if (assetMemo[text]) return assetMemo[text];
  const id = await createTextAsset(text);
  assetMemo[text] = id;
  await writeJson(ASSET_FILE, assetMemo);
  return id;
}

function daysAgo(n: number) {
  const d = new Date(Date.now() - n * 864e5);
  return d.toISOString().slice(0, 10);
}

// One niche = four named Oriane sub-queries OR-ed together. matchedQueries tells
// us HOW each video was found: by what is said, shown as text, captioned, or seen.
async function nicheQuery(q: string, withVisual: boolean): Promise<ContentQuery> {
  const base: ContentFilters = {
    format: { includes: ["video"] },
    platform: { includes: ["tiktok", "instagram"] },
    publishedAt: { after: daysAgo(365) },
  };
  const queries: ContentQuery[] = [
    { name: "said", operator: "and", filters: { ...base, transcript: { includesFuzzy: { values: [q] } } } },
    { name: "onscreen", operator: "and", filters: { ...base, onScreenText: { includesFuzzy: { values: [q] } } } },
    { name: "caption", operator: "and", filters: { ...base, caption: { includesFuzzy: { values: [q] } } } },
  ];
  if (withVisual) {
    try {
      const assetId = await assetFor(q);
      queries.push({ name: "seen", operator: "and", filters: { ...base, visualSimilarity: { includes: { values: [{ assetId, minScore: 0.3 }] } } } });
    } catch {
      /* visual is a bonus layer */
    }
  }
  return { operator: "or", queries };
}

async function liveCorpus(q: string, size: number, notes: string[]): Promise<SlimVideo[]> {
  let query = await nicheQuery(q, true);
  const pages = [
    { sort: "viewsCount:desc", limit: Math.min(100, Math.ceil(size / 2)) },
    { sort: "publishedAt:desc", limit: Math.min(100, Math.ceil(size / 2)) },
  ];
  let results;
  try {
    results = await Promise.all(pages.map((p) => searchContents(query, { ...p, projection: "full" })));
  } catch (e) {
    // Retry without the visual sub-query if that is what failed
    notes.push(`Visual sub-query skipped: ${(e as Error).message}`);
    query = await nicheQuery(q, false);
    results = await Promise.all(pages.map((p) => searchContents(query, { ...p, projection: "full" })));
  }
  const all = results.flatMap((r) => r.data || []);
  const total = results[0]?.metadata?.pagination?.totalCount;
  if (total) notes.push(`${total.toLocaleString()} matching videos in Oriane's index; analysed the top ${all.length} by views + most recent.`);
  const corpus = all.map(slim).filter((v) => v.views > 0);

  // AI-Vision gene probes: which corpus videos visually match each probe, and at which frame
  const ids = [...new Set(corpus.map((v) => v.id))].slice(0, 100);
  if (ids.length) {
    const probeResults = await Promise.allSettled(
      VISUAL_PROBES.map(async (p) => {
        const assetId = await assetFor(p.text);
        const r = await searchContents(
          { operator: "and", filters: { id: { includes: ids }, visualSimilarity: { includes: { values: [{ assetId, minScore: 0.28 }] } } } },
          { limit: 100, projection: "full", sort: "visualSimilarity:desc" },
        );
        return { gene: p.gene, data: r.data || [] };
      }),
    );
    let ok = 0;
    const byId = new Map(corpus.map((v) => [v.id, v]));
    for (const pr of probeResults) {
      if (pr.status !== "fulfilled") continue;
      ok++;
      for (const c of pr.value.data) {
        const v = byId.get(c.id);
        if (!v) continue;
        const frames = (c.media || []).flatMap((m) => m.frames || []).filter((f) => typeof f.visualSimilarityScore === "number");
        const best = frames.sort((a, b) => (b.visualSimilarityScore || 0) - (a.visualSimilarityScore || 0))[0];
        const t = best?.timestampSeconds ?? 0;
        const score = best?.visualSimilarityScore ?? 0.3;
        let target = v.frames.reduce((acc, f) => (Math.abs(f.t - t) < Math.abs(acc.t - t) ? f : acc), v.frames[0] || { t, url: best?.url || "", texts: [] });
        if (!v.frames.length) {
          target = { t, url: best?.url || "", texts: [] };
          v.frames.push(target);
        }
        (target.vis ||= []).push({ gene: pr.value.gene, score });
      }
    }
    notes.push(`AI-Vision probes: ${ok}/${VISUAL_PROBES.length} visual genes scanned across ${ids.length} videos.`);
  }
  return corpus;
}

export type EngineStatus = { oriane: boolean; llm: string | null };
export function status(): EngineStatus {
  return { oriane: !!orianeKey(), llm: process.env.ANTHROPIC_API_KEY ? "claude" : process.env.GMI_API_KEY ? "gmi" : process.env.OPENAI_API_KEY ? "openai" : null };
}

export async function nicheReport(q: string, opts: { fresh?: boolean; size?: number } = {}): Promise<NicheReport> {
  const file = path.join(CACHE_DIR, `${slug(q)}.json`);
  const notes: string[] = [];
  if (!opts.fresh) {
    const cached = await readJson<{ corpus: SlimVideo[]; notes: string[]; fetchedAt: string; source?: string }>(file);
    if (cached?.corpus?.length) {
      const r = analyze(q, cached.corpus, "cache", cached.notes || []);
      r.fetchedAt = cached.fetchedAt;
      return r;
    }
  }
  if (orianeKey()) {
    try {
      const corpus = await liveCorpus(q, opts.size || 100, notes);
      if (corpus.length >= 4) {
        const fetchedAt = new Date().toISOString();
        await writeJson(file, { corpus, notes, fetchedAt });
        return analyze(q, corpus, "live", notes);
      }
      notes.push(`Oriane returned only ${corpus.length} videos for “${q}”. Try a broader niche.`);
    } catch (e) {
      const err = e as OrianeError;
      notes.push(`Oriane live call failed (${err.status || "network"}: ${err.message}). Showing sample data.`);
    }
  } else {
    notes.push("No ORIANE_API_KEY set — showing a synthetic sample corpus. Add your key to go live.");
  }
  return analyze(q, sampleCorpus(q), "sample", notes);
}

export async function listCached(): Promise<{ q: string; slug: string; n: number; fetchedAt: string }[]> {
  try {
    const files = await fs.readdir(CACHE_DIR);
    const out = [];
    for (const f of files.filter((x) => x.endsWith(".json"))) {
      const j = await readJson<{ corpus: SlimVideo[]; fetchedAt: string; q?: string }>(path.join(CACHE_DIR, f));
      if (j?.corpus?.length) out.push({ q: f.replace(/\.json$/, "").replace(/-/g, " "), slug: f.replace(/\.json$/, ""), n: j.corpus.length, fetchedAt: j.fetchedAt });
    }
    return out.sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
  } catch {
    return [];
  }
}
