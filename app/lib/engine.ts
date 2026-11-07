import fs from "node:fs/promises";
import path from "node:path";
import { searchContents, createTextAsset, orianeKey, OrianeError, type ContentQuery, type ContentFilters } from "./oriane";
import { analyze, slim, VISUAL_PROBES } from "./genes";
import { sampleCorpus } from "./sample";
import type { Brief, NicheReport, SlimVideo } from "./types";
import { llmProvider } from "./llm";
import { genomeBrief } from "./brief";

// Bundled, read-only sequences (committed to the repo — instant demos anywhere)
const BUNDLED_DIR = path.join(process.cwd(), "data", "cache");
// Writable cache: repo folder locally, /tmp on serverless (Vercel)
const WRITE_DIR = process.env.HELIX_CACHE_DIR || (process.env.VERCEL ? "/tmp/helix-cache" : BUNDLED_DIR);
const ASSET_FILE = path.join(process.env.VERCEL ? "/tmp/helix-cache" : path.join(process.cwd(), "data"), "assets.json");
const BUNDLED_ASSETS = path.join(process.cwd(), "data", "assets.json");
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 3; // 3 days

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
    /* read-only FS — fine */
  }
}

let assetMemo: Record<string, string> | null = null;
async function assetFor(text: string): Promise<string> {
  if (!assetMemo) assetMemo = { ...((await readJson<Record<string, string>>(BUNDLED_ASSETS)) || {}), ...((await readJson<Record<string, string>>(ASSET_FILE)) || {}) };
  if (assetMemo[text]) return assetMemo[text];
  const id = await createTextAsset(text);
  assetMemo[text] = id;
  await writeJson(ASSET_FILE, assetMemo);
  return id;
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
}

// One niche = named Oriane sub-queries OR-ed together. matchedQueries tells us
// HOW each video was found: by what is said, shown as on-screen text, captioned, or seen.
async function nicheQuery(q: string, withVisual: boolean): Promise<ContentQuery> {
  const base: ContentFilters = {
    format: { includes: ["video"] },
    platform: { includes: ["tiktok", "instagram"] },
    publishedAt: { after: daysAgo(365) },
    viewsCount: { min: 5000 },
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

export type Progress = (msg: string) => void;

async function liveCorpus(q: string, notes: string[], progress: Progress = () => {}): Promise<SlimVideo[]> {
  // Two pages, both ranked by views, far apart: the hits AND the long tail — so lift
  // compares like with like (fully processed videos) across the performance range.
  // Page 1 includes the AI-Vision "seen" sub-query; page 2 (offset) can't paginate a
  // visual search without an anchor, so it uses the text signals only.
  progress("Querying Oriane: said · on-screen · caption");
  const textOnly = await nicheQuery(q, false);
  const settled = await Promise.allSettled([
    searchContents(textOnly, { sort: "viewsCount:desc", limit: 45, offset: 0, projection: "full" }),
    searchContents(textOnly, { sort: "viewsCount:desc", limit: 45, offset: 120, projection: "full" }),
  ]);
  const results = settled.filter((r) => r.status === "fulfilled").map((r) => (r as PromiseFulfilledResult<Awaited<ReturnType<typeof searchContents>>>).value);
  if (!results.length) throw (settled[0] as PromiseRejectedResult).reason;
  const all = results.flatMap((r) => r.data || []);
  const total = results[0]?.metadata?.pagination?.totalCount;
  const processed = all.map(slim).filter((v) => v.views > 0 && (v.frames.length > 0 || v.transcript.length > 0));
  if (total) notes.push(`${total.toLocaleString()} matching videos in Oriane's index · sequenced ${processed.length} (top 45 by views + 45 from rank 120+) with full frames, transcripts and OCR.`);
  if (all.length - processed.length > 0) notes.push(`${all.length - processed.length} videos skipped (not yet processed by Oriane).`);

  // AI-Vision gene probes: which corpus videos visually match each probe
  const ids = [...new Set(processed.map((v) => v.id))];
  if (ids.length) {
    progress("Running AI-Vision probes across the corpus");
    const byId = new Map(processed.map((v) => [v.id, v]));
    const probeResults = await Promise.allSettled(
      VISUAL_PROBES.map(async (p) => {
        const assetId = await assetFor(p.text);
        const r = await searchContents(
          { operator: "and", filters: { id: { includes: ids }, visualSimilarity: { includes: { values: [{ assetId, minScore: 0.12 }] } } } },
          { limit: 100, projection: "basic", sort: "visualSimilarity:desc" },
        );
        return { gene: p.gene, data: r.data || [] };
      }),
    );
    let ok = 0;
    for (const pr of probeResults) {
      if (pr.status !== "fulfilled") continue;
      ok++;
      pr.value.data.forEach((c, rank) => {
        const v = byId.get(c.id);
        if (!v) return;
        const target = v.frames[0] || { t: 0, url: v.thumb, texts: [] };
        if (!v.frames.length) v.frames.push(target);
        // basic projection has no per-frame score; keep rank-based confidence
        (target.vis ||= []).push({ gene: pr.value.gene, score: Math.max(0.12, 0.6 - rank * 0.01) });
      });
    }
    notes.push(`AI-Vision probes: ${ok}/${VISUAL_PROBES.length} visual genes scanned across ${ids.length} videos.`);
  }
  return processed;
}

export type EngineStatus = { oriane: boolean; llm: string | null; hosted: boolean };
export function status(): EngineStatus {
  return {
    oriane: !!orianeKey(),
    llm: llmProvider()?.label || null,
    hosted: !!process.env.VERCEL,
  };
}

type CacheFile = { q?: string; corpus: SlimVideo[]; notes: string[]; fetchedAt: string };

async function readCache(s: string): Promise<CacheFile | null> {
  const w = await readJson<CacheFile>(path.join(WRITE_DIR, `${s}.json`));
  const b = WRITE_DIR === BUNDLED_DIR ? null : await readJson<CacheFile>(path.join(BUNDLED_DIR, `${s}.json`));
  if (w && b) return w.fetchedAt > b.fetchedAt ? w : b;
  return w || b;
}

export async function isCached(q: string): Promise<boolean> {
  const c = await readCache(slug(q));
  return !!c?.corpus?.length && Date.now() - new Date(c.fetchedAt).getTime() < CACHE_TTL_MS;
}

export async function nicheReport(q: string, opts: { fresh?: boolean; progress?: Progress } = {}): Promise<NicheReport> {
  const s = slug(q);
  const notes: string[] = [];
  const cached = await readCache(s);
  const fresh = cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS;
  if (cached?.corpus?.length && (!opts.fresh || !orianeKey()) && (fresh || !orianeKey())) {
    const r = analyze(q, cached.corpus, "cache", cached.notes || []);
    r.fetchedAt = cached.fetchedAt;
    return r;
  }
  if (orianeKey()) {
    try {
      const corpus = await liveCorpus(q, notes, opts.progress);
      if (corpus.length >= 8) {
        const fetchedAt = new Date().toISOString();
        await writeJson(path.join(WRITE_DIR, `${s}.json`), { q, corpus, notes, fetchedAt });
        return analyze(q, corpus, "live", notes);
      }
      notes.push(`Oriane returned only ${corpus.length} processed videos for “${q}”. Try a broader niche.`);
    } catch (e) {
      const err = e as OrianeError;
      notes.push(`Oriane live call failed (${err.status || "network"}: ${err.message}).`);
    }
    if (cached?.corpus?.length) {
      const r = analyze(q, cached.corpus, "cache", [...notes, ...(cached.notes || [])]);
      r.fetchedAt = cached.fetchedAt;
      return r;
    }
    notes.push("Showing a synthetic sample corpus instead.");
  } else {
    notes.push("No ORIANE_API_KEY set — showing a synthetic sample corpus. Add your key to go live.");
  }
  return analyze(q, sampleCorpus(q), "sample", notes);
}

export async function listCached(): Promise<{ q: string; slug: string; n: number; fetchedAt: string }[]> {
  const out = new Map<string, { q: string; slug: string; n: number; fetchedAt: string }>();
  for (const dir of [...new Set([BUNDLED_DIR, WRITE_DIR])]) {
    let files: string[] = [];
    try {
      files = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const f of files.filter((x) => x.endsWith(".json"))) {
      const j = await readJson<CacheFile>(path.join(dir, f));
      const s = f.replace(/\.json$/, "");
      if (!j?.corpus?.length) continue;
      const prev = out.get(s);
      if (!prev || prev.fetchedAt < j.fetchedAt) out.set(s, { q: j.q || s.replace(/-/g, " "), slug: s, n: j.corpus.length, fetchedAt: j.fetchedAt });
    }
  }
  return [...out.values()].sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
}

// AI genome brief, cached per niche next to its sequence
export async function nicheBrief(q: string): Promise<Brief | null> {
  const s = slug(q);
  const file = path.join(WRITE_DIR, "briefs", `${s}.json`);
  const bundled = path.join(BUNDLED_DIR, "briefs", `${s}.json`);
  const report = await nicheReport(q);
  const cached = (await readJson<Brief & { fetchedAt?: string }>(file)) || (await readJson<Brief & { fetchedAt?: string }>(bundled));
  if (cached && cached.fetchedAt === report.fetchedAt) return cached;
  if (report.source === "sample") return null;
  const b = await genomeBrief(report);
  if (b) await writeJson(file, { ...b, fetchedAt: report.fetchedAt });
  return b;
}
