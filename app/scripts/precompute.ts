// Turns recorded live Oriane sequences (data/cache/*.json) into static NicheReports
// for the GitHub Pages edition: public/data/<slug>.json + public/data/index.json.
// If GMI_API_KEY is available (env or .env.local), each niche also gets its AI genome
// brief generated at BUILD time and baked in — so the static site never ships a key.
import fs from "node:fs";
import path from "node:path";
import { analyze } from "../lib/genes";
import { genomeBrief } from "../lib/brief";
import type { Brief, SlimVideo } from "../lib/types";

// load .env.local without printing anything
try {
  for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const src = path.join(process.cwd(), "data", "cache");
const briefDir = path.join(src, "briefs");
const out = path.join(process.cwd(), "public", "data");
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(briefDir, { recursive: true });

async function main() {
  const index: { q: string; slug: string; n: number; fetchedAt: string }[] = [];
  const files = fs.readdirSync(src).filter((x) => x.endsWith(".json"));
  await Promise.all(
    files.map(async (f) => {
      const j = JSON.parse(fs.readFileSync(path.join(src, f), "utf8")) as { q?: string; corpus: SlimVideo[]; notes: string[]; fetchedAt: string };
      const s = f.replace(/\.json$/, "");
      const q = j.q || s.replace(/-/g, " ");
      const r = analyze(q, j.corpus, "cache", j.notes || []);
      r.fetchedAt = j.fetchedAt;
      const bf = path.join(briefDir, `${s}.json`);
      let brief: (Brief & { fetchedAt?: string }) | null = fs.existsSync(bf) ? JSON.parse(fs.readFileSync(bf, "utf8")) : null;
      if (!brief || brief.fetchedAt !== r.fetchedAt) {
        const b = process.env.GMI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY ? await genomeBrief(r) : null;
        if (b) {
          brief = { ...b, fetchedAt: r.fetchedAt };
          fs.writeFileSync(bf, JSON.stringify(brief));
        }
      }
      r.brief = brief || null;
      fs.writeFileSync(path.join(out, `${s}.json`), JSON.stringify(r));
      index.push({ q, slug: s, n: r.corpus.length, fetchedAt: j.fetchedAt });
      console.log(`  ${q}: ${r.corpus.length} videos · brief ${brief ? "✓ " + brief.via : "—"}`);
    }),
  );
  index.sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
  fs.writeFileSync(path.join(out, "index.json"), JSON.stringify(index));
  console.log(`precomputed ${index.length} niches → public/data`);
}
main();
