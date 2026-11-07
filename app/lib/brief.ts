import { chat, parseJson } from "./llm";
import type { Brief, NicheReport } from "./types";

// The AI genome brief: an LLM (GMI Cloud by default) reads ONLY the measured gene
// statistics + real opening lines from the top videos, and writes a strategist's
// Monday brief. Every claim it may make is grounded in numbers we pass in.

function evidence(r: NicheReport) {
  const top = r.corpus.slice().sort((a, b) => b.views - a.views).slice(0, 8);
  const openers = top
    .map((v) => {
      const said = v.transcript[0]?.text?.slice(0, 120);
      const shown = v.frames.find((f) => f.texts.length)?.texts.map((t) => t.text).join(" ").slice(0, 80);
      return `- @${v.handle} (${Math.round(v.views / 1000)}K views): said “${said || "(no voice)"}” · on-screen “${shown || "(none)"}”`;
    })
    .join("\n");
  const genes = r.genes
    .slice(0, 14)
    .map((g) => `- ${g.label} [${g.track}]: lift ${g.lift}× (n=${g.n}, ${g.topShare}% of top quartile vs ${g.bottomShare}% of bottom)`)
    .join("\n");
  const losers = r.genes
    .filter((g) => g.lift < 0.8 && g.n >= 4)
    .slice(-5)
    .map((g) => `- ${g.label}: lift ${g.lift}× (n=${g.n})`)
    .join("\n");
  return { openers, genes, losers };
}

export async function genomeBrief(r: NicheReport): Promise<Brief | null> {
  const e = evidence(r);
  const prompt = `You are a senior short-form content strategist. Write a Monday brief for creators in the "${r.query}" niche on TikTok/Instagram.
Use ONLY the measured data below (from ${r.corpus.length} real videos, ${r.metric} lift = median with gene ÷ median without). Cite numbers. No generic advice.

GENES RANKED BY LIFT:
${e.genes}

GENES THAT UNDERPERFORM:
${e.losers || "- none significant"}

OPENING LINES OF THE TOP VIDEOS:
${e.openers}

Return ONLY JSON:
{"headline":"one punchy sentence with the single biggest finding and its number",
 "moves":["3 concrete things to do this week, each citing a lift number"],
 "avoid":"one thing to stop doing, citing its number",
 "hooks":["3 original opening lines for this niche that follow the winning genes (do not copy the openers)"]}`;
  const res = await chat(prompt, { maxTokens: 700, temperature: 0.5 });
  if (!res) return null;
  const j = parseJson<{ headline?: string; moves?: string[]; avoid?: string; hooks?: string[] }>(res.text);
  if (!j?.headline) return null;
  return {
    headline: j.headline,
    moves: (j.moves || []).slice(0, 3),
    avoid: j.avoid || "",
    hooks: (j.hooks || []).slice(0, 3),
    via: res.via.label,
    generatedAt: new Date().toISOString(),
  };
}
