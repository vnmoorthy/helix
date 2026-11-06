import type { SlimVideo, SlimFrame } from "./types";

// Deterministic synthetic corpus used ONLY when no Oriane key is configured.
// The UI labels it "Sample data" everywhere it appears.

function rng(seedStr: string) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["maya", "jordan", "the", "daily", "real", "just", "itsme", "simply", "hey", "not", "ask", "big", "tiny", "late", "slow"];
const LAST = ["eats", "codes", "lifts", "studio", "lab", "diaries", "talks", "made", "fixes", "brews", "builds", "glow", "runs", "notes", "club"];
const SOUNDS = ["Espresso — Sabrina Carpenter", "APT. — ROSÉ & Bruno Mars", "Good Luck, Babe! — Chappell Roan", "Birds of a Feather — Billie Eilish", "Not Like Us — Kendrick Lamar"];

export function sampleCorpus(q: string, n = 84): SlimVideo[] {
  const r = rng(q.toLowerCase());
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const topic = q.trim() || "this";
  const out: SlimVideo[] = [];
  for (let i = 0; i < n; i++) {
    const g = {
      question: r() < 0.32,
      you: r() < 0.45,
      number: r() < 0.22,
      contrarian: r() < 0.2,
      experiment: r() < 0.18,
      instant: r() < 0.5,
      fast: r() < 0.4,
      silent: r() < 0.12,
      cta: r() < 0.35,
      textHook: r() < 0.55,
      captions: r() < 0.4,
      caps: r() < 0.3,
      pov: r() < 0.15,
      original: r() < 0.55,
      trending: r() < 0.3,
      facecam: r() < 0.5,
      hands: r() < 0.35,
      screen: r() < 0.15,
      outdoor: r() < 0.3,
    };
    if (g.silent) { g.question = g.you = g.number = g.contrarian = g.experiment = g.instant = g.fast = g.cta = g.captions = false; g.facecam = false; }
    // Hidden "truth" of this niche: these genes genuinely lift performance
    let mult = 1;
    if (g.textHook) mult *= 1.9;
    if (g.question) mult *= 1.55;
    if (g.instant) mult *= 1.45;
    if (g.hands) mult *= 1.6;
    if (g.trending && !g.original) mult *= 1.35;
    if (g.captions) mult *= 1.25;
    if (g.contrarian) mult *= 1.3;
    if (g.silent) mult *= 0.6;
    if (g.screen) mult *= 0.8;
    const duration = g.silent ? 6 + r() * 8 : 9 + r() * (r() < 0.25 ? 60 : 28);
    if (duration < 30) mult *= 1.2;
    const followers = Math.round(Math.exp(8 + r() * 6.5));
    const noise = Math.exp((r() - 0.5) * 1.6);
    const vrf = Math.max(0.5, 18 * mult * noise * (0.6 + r()));
    const views = Math.round((followers * vrf) / 100) + Math.round(r() * 2000);
    const likes = Math.round(views * (0.03 + r() * 0.08));
    const comments = Math.round(likes * (0.01 + r() * 0.05));
    const shares = Math.round(likes * (0.02 + r() * 0.1));
    const handle = `${pick(FIRST)}${pick(LAST)}${Math.floor(r() * 90 + 10)}`;

    // spoken
    const hooks: string[] = [];
    if (g.question) hooks.push(g.you ? `Why is nobody telling you this about ${topic}?` : `Is ${topic} actually worth it?`);
    else if (g.contrarian) hooks.push(`Stop doing ${topic} like this.`);
    else if (g.number) hooks.push(`3 things about ${topic} you need to know.`);
    else if (g.experiment) hooks.push(`I tried ${topic} every day for a week.`);
    else hooks.push(g.you ? `Here's what you get wrong about ${topic}.` : `Okay so ${topic}, let's talk about it.`);
    if (g.number && !hooks[0].includes("3 things")) hooks.push(`Here are 3 things that changed everything.`);
    const body = [
      `First, most people skip the basics and it shows.`,
      `The second thing is consistency, honestly that's the whole game.`,
      `And the last one surprised me the most.`,
      `This is the part nobody shows on camera.`,
    ];
    const lines = [...hooks, ...body.slice(0, 2 + Math.floor(r() * 3))];
    if (g.cta) lines.push(pick(["Follow for part two.", "Comment which one you're trying first.", "Save this for later."]));
    const transcript: SlimVideo["transcript"] = [];
    if (!g.silent) {
      let t = g.instant ? 0.1 + r() * 0.3 : 0.8 + r() * 1.5;
      const wps = g.fast ? 3.2 + r() * 0.8 : 2 + r() * 0.8;
      for (const line of lines) {
        const len = line.split(" ").length / wps;
        if (t > duration) break;
        transcript.push({ s: +t.toFixed(2), e: +Math.min(duration, t + len).toFixed(2), text: line });
        t += len + 0.15;
      }
    }

    // frames
    const nf = Math.min(12, Math.max(4, Math.round(duration / 2.5)));
    const frames: SlimFrame[] = [];
    const overlay = g.caps ? `${topic.toUpperCase()} HACK` : g.pov ? `POV: you finally figured out ${topic}` : `${topic} in 30 seconds`;
    for (let k = 0; k < nf; k++) {
      const t = +((k * duration) / nf).toFixed(2);
      const texts: SlimFrame["texts"] = [];
      if (k === 0 && g.textHook) texts.push({ text: overlay, poly: [{ x: 0.1, y: 0.12 }, { x: 0.9, y: 0.12 }, { x: 0.9, y: 0.22 }, { x: 0.1, y: 0.22 }] });
      if (g.captions && transcript.length) {
        const c = transcript.find((x) => x.s <= t + 0.5 && x.e >= t) || transcript[Math.min(k, transcript.length - 1)];
        texts.push({ text: c.text.split(" ").slice(0, 5).join(" "), poly: [{ x: 0.15, y: 0.7 }, { x: 0.85, y: 0.7 }, { x: 0.85, y: 0.78 }, { x: 0.15, y: 0.78 }] });
      }
      const vis: SlimFrame["vis"] = [];
      if (g.facecam && r() < 0.7) vis.push({ gene: "vis.facecam", score: 0.32 + r() * 0.3 });
      if (g.hands && k <= 2) vis.push({ gene: "vis.hands", score: 0.33 + r() * 0.3 });
      if (g.screen && r() < 0.6) vis.push({ gene: "vis.screen", score: 0.3 + r() * 0.3 });
      if (g.outdoor && r() < 0.5) vis.push({ gene: "vis.outdoor", score: 0.3 + r() * 0.3 });
      frames.push({ t, url: "", texts, vis });
    }
    const title = g.trending ? pick(SOUNDS) : g.original ? "original sound" : `${pick(["lofi", "upbeat", "chill", "cinematic"])} beat ${Math.floor(r() * 900)}`;
    const tagPool = [topic.replace(/\s+/g, ""), "fyp", "viral", "tips", "creator", "howto", "trending", "foryou"];
    const nTags = r() < 0.3 ? 0 : 1 + Math.floor(r() * 7);
    const capText = r() < 0.4 ? `${topic} changed my routine` : r() < 0.5 ? `Nobody talks about this part of ${topic}. Here's the full breakdown of what I learned after trying it for a month, the mistakes I made, and what I'd do differently if I started again today — save it for later!` : `${topic}: the honest version`;
    const matched: string[] = [];
    if (!g.silent && r() < 0.8) matched.push("said");
    if (g.textHook && r() < 0.7) matched.push("onscreen");
    if (r() < 0.38) matched.push("caption");
    if (r() < 0.45) matched.push("seen");
    if (!matched.length) matched.push("said");
    out.push({
      id: `sample_${i}_${handle}`,
      platform: r() < 0.6 ? "tiktok" : "instagram",
      link: "#",
      handle,
      displayName: handle.replace(/\d+$/, ""),
      followers,
      caption: capText + (nTags ? " " + tagPool.slice(0, nTags).map((t) => "#" + t).join(" ") : ""),
      hashtags: tagPool.slice(0, nTags),
      publishedAt: new Date(Date.UTC(2026, 4 + Math.floor(r() * 6), 1 + Math.floor(r() * 27))).toISOString(),
      thumb: "",
      views,
      likes,
      comments,
      shares,
      er: +((100 * (likes + comments + shares)) / Math.max(1, views)).toFixed(2),
      vrf: +((100 * views) / followers).toFixed(2),
      duration: +duration.toFixed(1),
      audio: { title, author: g.original ? handle : "", original: g.original && !g.trending, copyrighted: !g.original || g.trending },
      transcript,
      frames,
      matched,
      genes: [],
    });
  }
  return out;
}
