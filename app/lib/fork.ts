import { GENE_BY_ID } from "./genes";
import type { ForkBeat, ForkPlan, GeneStat, SlimVideo } from "./types";

export type ForkInput = {
  niche: string;
  product: string; // what YOU are making the video about
  creator: string; // your handle / persona
  audience?: string;
  style?: "face" | "faceless" | "hands";
  genes: string[]; // gene ids to inherit
  lifts?: Record<string, number>;
  source?: Pick<SlimVideo, "id" | "duration" | "transcript" | "frames" | "audio" | "handle">;
  trendingSound?: string;
};

const has = (ids: string[], id: string) => ids.includes(id);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function hookLine(i: ForkInput) {
  const p = i.product;
  const aud = i.audience ? ` ${i.audience}` : "";
  if (has(i.genes, "hook.contrarian")) return `Stop buying ${p} until you've seen this.`;
  if (has(i.genes, "hook.question") && has(i.genes, "hook.you")) return `Why is nobody telling you this about ${p}?`;
  if (has(i.genes, "hook.question")) return `Is ${p} actually worth it${aud ? " for" + aud : ""}?`;
  if (has(i.genes, "hook.number")) return `3 things about ${p} I wish I knew sooner.`;
  if (has(i.genes, "hook.experiment")) return `I used ${p} every day for a week. Here's what happened.`;
  if (has(i.genes, "hook.you")) return `If you're into ${i.niche}, you need to see this ${p} trick.`;
  return `Okay — ${p}. Let's talk about it.`;
}

function overlay(i: ForkInput) {
  const base = has(i.genes, "text.pov") ? `POV: you finally found the right ${i.product}` : has(i.genes, "hook.number") ? `3 ${i.product} SECRETS` : `${i.product} — the honest truth`;
  return has(i.genes, "text.caps") ? base.toUpperCase() : base;
}

function shot(i: ForkInput, beat: "hook" | "setup" | "proof" | "cta") {
  const face = i.style === "face" || has(i.genes, "vis.facecam");
  const hands = i.style === "hands" || has(i.genes, "vis.hands");
  const screen = has(i.genes, "vis.screen");
  const outdoor = has(i.genes, "vis.outdoor");
  const where = outdoor ? "outside, natural light" : "at your desk, window light";
  switch (beat) {
    case "hook":
      if (has(i.genes, "vis.textcard")) return `Bold text card, then hard cut to you ${where}.`;
      if (hands) return `Extreme close-up: your hands bring ${i.product} into frame, ${where}.`;
      if (face) return `Face to camera, eye-level, tight framing, ${where}. Already mid-sentence.`;
      return `Hero shot of ${i.product}, slow push-in, ${where}.`;
    case "setup":
      if (has(i.genes, "vis.beforeafter")) return `Split screen: BEFORE (left) vs AFTER (right).`;
      if (screen) return `Screen recording: show it working, cursor/finger guiding the eye.`;
      return face ? `Medium shot, you + ${i.product} in frame; one jump cut per sentence.` : `B-roll of ${i.product} in use — 3 quick angles.`;
    case "proof":
      return hands ? `Close-up demo in hand — the moment the result is visible.` : `Show the result on camera, hold 1 beat longer than feels natural.`;
    case "cta":
      return face ? `Back to face cam, lean in for the ask.` : `Final hero shot of ${i.product} with the ask on screen.`;
  }
}

export function templateFork(i: ForkInput): ForkPlan {
  const g = i.genes;
  const len = has(g, "len.snack") ? 9 : has(g, "len.mid") ? 42 : has(g, "len.long") ? 70 : 24;
  const t0 = has(g, "spoken.instant") ? 0 : 0.6;
  const silent = has(g, "spoken.silent");
  const sound = has(g, "sound.trending") && i.trendingSound ? `Trending: ${i.trendingSound}` : has(g, "sound.licensed") ? "Licensed track under voice, -18dB" : has(g, "sound.original") ? "Original audio — your voice, room tone" : "Your call";
  const hookEnd = Math.min(2, len * 0.15);
  const setupEnd = len * 0.45;
  const proofEnd = len * 0.85;
  const captions = has(g, "text.captions") ? " + word-by-word captions" : "";
  const beats: ForkBeat[] = [
    {
      slot: "HOOK",
      start: t0,
      end: +hookEnd.toFixed(1),
      shot: shot(i, "hook"),
      say: silent ? "(no voice)" : hookLine(i),
      onscreen: has(g, "text.hook") || has(g, "text.heavy") || has(g, "text.caps") || has(g, "text.pov") ? `“${overlay(i)}”${captions}` : has(g, "text.none") ? "(clean frame)" : captions ? "word-by-word captions" : "(optional)",
      sound,
      genes: g.filter((x) => /^hook\.|spoken\.instant|text\.(hook|caps|pov)|vis\.(facecam|hands|textcard)/.test(x)),
      swapped: `Topic → ${i.product}; creator → @${i.creator.replace(/^@/, "")}`,
    },
    {
      slot: "SETUP",
      start: +hookEnd.toFixed(1),
      end: +setupEnd.toFixed(1),
      shot: shot(i, "setup"),
      say: silent ? "(no voice — let the visuals carry)" : `Here's the thing most people miss about ${i.product}${i.audience ? " — especially " + i.audience : ""}.`,
      onscreen: has(g, "text.heavy") ? `Key point as text, 4–6 words${captions}` : captions ? "word-by-word captions" : "—",
      sound,
      genes: g.filter((x) => /spoken\.fast|text\.(heavy|captions)|vis\.(screen|beforeafter|outdoor)/.test(x)),
      swapped: "Your own claim, your own footage",
    },
    {
      slot: "PROOF",
      start: +setupEnd.toFixed(1),
      end: +proofEnd.toFixed(1),
      shot: shot(i, "proof"),
      say: silent ? "(music swells)" : `Watch — this is the difference.`,
      onscreen: has(g, "text.heavy") || has(g, "text.captions") ? "Result called out on screen" : "—",
      sound,
      genes: g.filter((x) => /vis\.(hands|beforeafter)|len\./.test(x)),
      swapped: "Your result, your proof",
    },
    {
      slot: "CTA",
      start: +proofEnd.toFixed(1),
      end: len,
      shot: shot(i, "cta"),
      say: silent ? "(none)" : has(g, "cta.engage") ? `Comment “${i.product.split(" ")[0].toUpperCase()}” and I'll send you the full breakdown.` : `That's it. Try it and tell me.`,
      onscreen: has(g, "cta.engage") ? "Comment prompt on screen" : "—",
      sound,
      genes: g.filter((x) => /cta\.|sound\./.test(x)),
      swapped: "Your ask, your audience",
    },
  ];
  const tags = has(g, "tags.none") ? [] : has(g, "tags.many") ? [i.niche, i.product, "tutorial", "honestreview", "fyp"].map((t) => t.replace(/\s+/g, "").toLowerCase()) : [i.niche.replace(/\s+/g, "").toLowerCase(), i.product.replace(/\s+/g, "").toLowerCase()];
  const caption = has(g, "caption.story")
    ? `I didn't expect ${i.product} to change this much. Here's the full breakdown — what worked, what didn't, and what I'd do differently. Save it for when you need it.`
    : `${cap(i.product)}, honestly.`;
  const lifts = g.map((x) => i.lifts?.[x] || 1).filter((x) => x > 1);
  const predicted = lifts.length ? Math.min(9.9, lifts.reduce((a, b) => a * Math.pow(b, 0.35), 1)) : 1;
  return {
    title: `${cap(i.product)} × ${i.niche} — forked genome`,
    product: i.product,
    creator: i.creator,
    style: i.style || "face",
    duration: len,
    beats,
    caption,
    hashtags: tags,
    predictedLift: Math.round(predicted * 10) / 10,
    engine: "helix-template",
    sourceVideoId: i.source?.id,
  };
}

// Optional LLM polish — rewrites the spoken lines in the creator's voice while
// keeping the gene structure fixed. Works with Anthropic, GMI Cloud (OpenAI
// compatible) or OpenAI. Falls back silently to the template.
export async function llmFork(i: ForkInput): Promise<ForkPlan> {
  const plan = templateFork(i);
  const geneList = i.genes.map((id) => `${id} (${GENE_BY_ID[id]?.recipe || ""})`).join("\n");
  const prompt = `You are a short-form video scriptwriter. Rewrite the SAY and ONSCREEN lines of this 4-beat shot list for a video about "${i.product}" by creator @${i.creator} in the "${i.niche}" niche${i.audience ? " for " + i.audience : ""}.
You MUST keep every inherited gene (structure) below, but never copy any source content. Return ONLY JSON: {"beats":[{"say":"...","onscreen":"..."} x4],"caption":"..."}.
Genes:\n${geneList}\nCurrent plan:\n${JSON.stringify(plan.beats.map((b) => ({ slot: b.slot, say: b.say, onscreen: b.onscreen })))}`;
  try {
    let text = "";
    if (process.env.ANTHROPIC_API_KEY) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5", max_tokens: 900, messages: [{ role: "user", content: prompt }] }),
      });
      const j = await r.json();
      text = j?.content?.[0]?.text || "";
    } else if (process.env.GMI_API_KEY || process.env.OPENAI_API_KEY) {
      const gmi = !!process.env.GMI_API_KEY;
      const r = await fetch(gmi ? (process.env.GMI_BASE_URL || "https://api.gmi-serving.com/v1") + "/chat/completions" : "https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { authorization: `Bearer ${gmi ? process.env.GMI_API_KEY : process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ model: gmi ? process.env.GMI_MODEL || "deepseek-ai/DeepSeek-V3-0324" : "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 900 }),
      });
      const j = await r.json();
      text = j?.choices?.[0]?.message?.content || "";
    } else return plan;
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return plan;
    const parsed = JSON.parse(m[0]) as { beats?: { say?: string; onscreen?: string }[]; caption?: string };
    parsed.beats?.forEach((b, k) => {
      if (!plan.beats[k]) return;
      if (b.say) plan.beats[k].say = b.say;
      if (b.onscreen) plan.beats[k].onscreen = b.onscreen;
    });
    if (parsed.caption) plan.caption = parsed.caption;
    plan.engine = "llm";
    return plan;
  } catch {
    return plan;
  }
}

export function genesFromWinning(w: GeneStat[]) {
  return { genes: w.map((g) => g.id), lifts: Object.fromEntries(w.map((g) => [g.id, g.lift])) };
}
