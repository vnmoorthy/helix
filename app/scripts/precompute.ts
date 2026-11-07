// Turns recorded live Oriane sequences (data/cache/*.json) into static NicheReports
// for the GitHub Pages edition: public/data/<slug>.json + public/data/index.json
import fs from "node:fs";
import path from "node:path";
import { analyze } from "../lib/genes";
import type { SlimVideo } from "../lib/types";

const src = path.join(process.cwd(), "data", "cache");
const out = path.join(process.cwd(), "public", "data");
fs.mkdirSync(out, { recursive: true });
const index: { q: string; slug: string; n: number; fetchedAt: string }[] = [];
for (const f of fs.readdirSync(src).filter((x) => x.endsWith(".json"))) {
  const j = JSON.parse(fs.readFileSync(path.join(src, f), "utf8")) as { q?: string; corpus: SlimVideo[]; notes: string[]; fetchedAt: string };
  const s = f.replace(/\.json$/, "");
  const q = j.q || s.replace(/-/g, " ");
  const r = analyze(q, j.corpus, "cache", j.notes || []);
  r.fetchedAt = j.fetchedAt;
  fs.writeFileSync(path.join(out, `${s}.json`), JSON.stringify(r));
  index.push({ q, slug: s, n: r.corpus.length, fetchedAt: j.fetchedAt });
}
index.sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
fs.writeFileSync(path.join(out, "index.json"), JSON.stringify(index));
console.log(`precomputed ${index.length} niches → public/data`);
