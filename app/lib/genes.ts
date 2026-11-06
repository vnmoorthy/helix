import type { Content } from "./oriane";
import type { GeneDef, GeneHit, GeneStat, SlimFrame, SlimVideo, NicheReport, Track } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// The gene catalog. Every gene is read from a concrete Oriane field — never
// guessed by an LLM — so every claim on screen has a timestamp and a source.
// ─────────────────────────────────────────────────────────────────────────────
export const GENES: GeneDef[] = [
  // SPOKEN — transcriptChunks
  { id: "hook.question", label: "Question hook", track: "spoken", blurb: "First spoken line asks the viewer a question.", recipe: "Open by asking the exact question your viewer is already asking themselves." },
  { id: "hook.you", label: "Direct 'you' hook", track: "spoken", blurb: "First line addresses the viewer directly (you / your).", recipe: "Say 'you' in the first sentence — talk to one person, not an audience." },
  { id: "hook.number", label: "Listicle hook", track: "spoken", blurb: "Hook promises a count: '3 things', '5 ways'.", recipe: "Promise a specific number of things in the first line." },
  { id: "hook.contrarian", label: "Contrarian hook", track: "spoken", blurb: "Opens with stop / never / don't / mistake / wrong.", recipe: "Open by calling out a mistake the viewer is making." },
  { id: "hook.experiment", label: "'I tried' experiment", track: "spoken", blurb: "Personal test format: I tried / I tested / I spent.", recipe: "Frame it as a personal experiment with a result." },
  { id: "spoken.instant", label: "Talks in < 0.5s", track: "spoken", blurb: "First word lands within half a second.", recipe: "No intro, no breath — first word on frame one." },
  { id: "spoken.fast", label: "Fast pace (3+ w/s)", track: "spoken", blurb: "Speaks at 3+ words per second.", recipe: "Cut every pause; script at ~3 words per second." },
  { id: "spoken.silent", label: "No voice", track: "spoken", blurb: "No speech — visuals, text and music carry it.", recipe: "Let visuals + on-screen text tell the story with zero voiceover." },
  { id: "cta.engage", label: "Spoken CTA", track: "spoken", blurb: "Asks to follow / comment / save / share.", recipe: "Close with one explicit ask: comment, save or follow." },
  // ON-SCREEN — frames[].onScreenTextRegions
  { id: "text.hook", label: "Text hook in frame 1", track: "onscreen", blurb: "On-screen text visible in the first second.", recipe: "Burn a 3–6 word headline onto the very first frame." },
  { id: "text.captions", label: "Burned-in captions", track: "onscreen", blurb: "On-screen words mirror the spoken words.", recipe: "Add word-by-word captions that follow the voice." },
  { id: "text.heavy", label: "Text-heavy", track: "onscreen", blurb: "Text overlay on most frames.", recipe: "Keep a text layer on screen almost the entire time." },
  { id: "text.caps", label: "ALL-CAPS overlay", track: "onscreen", blurb: "Overlay set in capitals.", recipe: "Set the hook overlay in ALL CAPS." },
  { id: "text.pov", label: "POV / framing text", track: "onscreen", blurb: "Overlay frames the scene: POV / when / me when.", recipe: "Use a 'POV:' line to drop the viewer into the scene." },
  { id: "text.none", label: "No overlay", track: "onscreen", blurb: "Zero on-screen text.", recipe: "Clean frame, no text — the image does the work." },
  // SOUND — audio*
  { id: "sound.original", label: "Original audio", track: "sound", blurb: "Uses the creator's own sound, not a track.", recipe: "Record your own audio instead of using a library track." },
  { id: "sound.licensed", label: "Licensed music", track: "sound", blurb: "Uses a copyrighted music track.", recipe: "Lay a recognisable licensed track under the video." },
  { id: "sound.trending", label: "Trending sound", track: "sound", blurb: "Track reused by several videos in this niche.", recipe: "Use the sound other winners in this niche are using right now." },
  // FORMAT — media.duration, caption, hashtags
  { id: "len.snack", label: "Under 10s", track: "format", blurb: "Snackable: under 10 seconds.", recipe: "Cut it to under 10 seconds." },
  { id: "len.short", label: "10–30s", track: "format", blurb: "Classic short: 10 to 30 seconds.", recipe: "Land it between 10 and 30 seconds." },
  { id: "len.mid", label: "30–60s", track: "format", blurb: "Mid-form: 30 to 60 seconds.", recipe: "Give it room: 30 to 60 seconds." },
  { id: "len.long", label: "60s+", track: "format", blurb: "Long-form short: over a minute.", recipe: "Go deep — over a minute is fine in this niche." },
  { id: "caption.short", label: "Short caption", track: "format", blurb: "Caption under 60 characters.", recipe: "Keep the caption under 60 characters." },
  { id: "caption.story", label: "Long caption", track: "format", blurb: "Caption over 200 characters — tells a story.", recipe: "Write a long story caption (200+ chars)." },
  { id: "tags.none", label: "No hashtags", track: "format", blurb: "Zero hashtags.", recipe: "Skip hashtags entirely." },
  { id: "tags.many", label: "5+ hashtags", track: "format", blurb: "Five or more hashtags.", recipe: "Stack 5+ niche hashtags." },
  // VISUAL — visualSimilarity probes (Oriane AI Vision)
  { id: "vis.facecam", label: "Face to camera", track: "visual", blurb: "A person talking straight into the lens.", recipe: "Shoot face-to-camera, eye-level, close." },
  { id: "vis.hands", label: "Hands + product", track: "visual", blurb: "Hands holding / demoing an object close-up.", recipe: "Show the thing in your hands, close to the lens." },
  { id: "vis.screen", label: "Screen recording", track: "visual", blurb: "Phone or computer screen capture.", recipe: "Show the screen — let them see it working." },
  { id: "vis.outdoor", label: "Outdoors", track: "visual", blurb: "Shot outside — street, nature, city.", recipe: "Take it outside; real-world backdrop." },
  { id: "vis.textcard", label: "Text card", track: "visual", blurb: "Big text on a plain background.", recipe: "Open on a bold text card." },
  { id: "vis.beforeafter", label: "Before / after", track: "visual", blurb: "Split or sequential before-and-after.", recipe: "Show the before, then the after." },
];

export const GENE_BY_ID: Record<string, GeneDef> = Object.fromEntries(GENES.map((g) => [g.id, g]));

export const VISUAL_PROBES: { gene: string; text: string }[] = [
  { gene: "vis.facecam", text: "a person talking directly to the camera, close-up of their face" },
  { gene: "vis.hands", text: "hands holding a product close to the camera" },
  { gene: "vis.screen", text: "a screen recording of a phone or computer screen" },
  { gene: "vis.outdoor", text: "outdoor scene, street or nature" },
  { gene: "vis.textcard", text: "large bold text on a plain colored background" },
  { gene: "vis.beforeafter", text: "split screen before and after comparison" },
];

export const TRACK_META: Record<Track, { label: string; color: string; field: string }> = {
  visual: { label: "Visual", color: "#d9f99d", field: "frames · AI Vision" },
  spoken: { label: "Spoken", color: "#f9a8d4", field: "transcriptChunks" },
  onscreen: { label: "On-screen", color: "#7dd3fc", field: "onScreenTextRegions" },
  sound: { label: "Sound", color: "#fcd34d", field: "audio*" },
  format: { label: "Format", color: "#c4b5fd", field: "duration · caption" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Slimming: Oriane full projection → compact client shape
// ─────────────────────────────────────────────────────────────────────────────
function platformLink(c: Content): string {
  if (c.platform === "tiktok") return `https://www.tiktok.com/@${c.profileHandle}/video/${c.platformId}`;
  if (c.platform === "youtube") return `https://www.youtube.com/shorts/${c.platformId}`;
  return `https://www.instagram.com/${c.profileHandle}/`;
}

export function slim(c: Content): SlimVideo {
  const m = (c.media || []).find((x) => x.type === "video") || (c.media || [])[0];
  const frames: SlimFrame[] = (m?.frames || [])
    .slice()
    .sort((a, b) => a.timestampSeconds - b.timestampSeconds)
    .map((f) => ({
      t: f.timestampSeconds,
      url: f.url,
      texts: (f.onScreenTextRegions || []).map((r) => ({ text: r.text, poly: r.polygon })),
    }));
  const transcript = (m?.transcriptChunks || []).map((t) => ({ s: t.startSeconds, e: t.endSeconds, text: t.text }));
  if (!transcript.length && m?.transcript) transcript.push({ s: 0, e: m.duration || 0, text: m.transcript });
  const audioTitle = c.audioTitle || "";
  const original = /original (sound|audio)|son original|sonido original|audio original/i.test(audioTitle) || (!!c.audioAuthor && c.audioAuthor.replace(/^@/, "").toLowerCase() === c.profileHandle.toLowerCase());
  return {
    id: c.id,
    platform: c.platform,
    link: platformLink(c),
    handle: c.profileHandle,
    displayName: c.profileDisplayName || c.profileHandle,
    avatar: c.profilePictureUrl,
    followers: c.profileFollowersCount || 0,
    verified: c.profileVerified,
    caption: c.caption || "",
    hashtags: c.hashtags || [],
    publishedAt: c.publishedAt,
    thumb: c.thumbnailMediaUrl,
    views: c.viewsCount || 0,
    likes: c.likesCount || 0,
    comments: c.commentsCount || 0,
    shares: c.sharesCount || 0,
    er: c.engagementRatePerViews || 0,
    vrf: c.viewsRatePerFollowers || (c.profileFollowersCount ? (100 * (c.viewsCount || 0)) / c.profileFollowersCount : 0),
    duration: m?.duration || 0,
    audio: { title: audioTitle, author: c.audioAuthor || "", original, copyrighted: !!c.audioCopyrighted },
    transcript,
    frames,
    matched: c.matchedQueries || [],
    genes: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Gene extraction — deterministic, evidence-carrying
// ─────────────────────────────────────────────────────────────────────────────
const words = (s: string) => (s.toLowerCase().match(/[a-z0-9']+/g) || []);
const NUM = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(things|ways|tips|reasons|mistakes|steps|hacks|products|signs|habits|rules|secrets|foods|apps|tools)\b/i;

export function extractGenes(v: SlimVideo, trendingTitles: Set<string>): GeneHit[] {
  const hits: GeneHit[] = [];
  const add = (id: string, evidence: string, field: string, t?: number, tEnd?: number) => hits.push({ id, evidence, field, t, tEnd });

  // SPOKEN
  const tr = v.transcript.filter((c) => c.text && c.text.trim());
  const full = tr.map((c) => c.text).join(" ");
  const wc = words(full).length;
  if (!tr.length || wc < 4) {
    add("spoken.silent", "No speech detected in transcript", "media.transcript");
  } else {
    const first = tr[0];
    const hookText = tr.filter((c) => c.s <= Math.max(3, first.s + 0.01)).map((c) => c.text).join(" ").slice(0, 160) || first.text;
    const firstSentence = (hookText.match(/^[^.!?]*[.!?]?/) || [hookText])[0];
    if (/\?/.test(firstSentence) || /^(why|how|what|who|did|do|have|are|is|can|would|ever|which|where|when)\b/i.test(firstSentence.trim()))
      add("hook.question", `“${firstSentence.trim()}”`, "transcriptChunks[0]", first.s, first.e);
    if (/\b(you|your|you're|youre)\b/i.test(firstSentence)) add("hook.you", `“${firstSentence.trim()}”`, "transcriptChunks[0]", first.s, first.e);
    const nm = hookText.match(NUM);
    if (nm) add("hook.number", `“…${nm[0]}…”`, "transcriptChunks[0]", first.s, first.e);
    if (/\b(stop|never|don't|dont|mistake|wrong|worst|quit|avoid|nobody|no one)\b/i.test(firstSentence)) add("hook.contrarian", `“${firstSentence.trim()}”`, "transcriptChunks[0]", first.s, first.e);
    const exp = full.slice(0, 260).match(/\bI (tried|tested|spent|ate|did|bought|used|wore|made|switched)\b[^.?!]{0,60}/i);
    if (exp) add("hook.experiment", `“${exp[0]}”`, "transcriptChunks", first.s);
    if (first.s <= 0.5) add("spoken.instant", `First word at ${first.s.toFixed(1)}s`, "transcriptChunks[0].startSeconds", first.s);
    const spokenSpan = Math.max(1, tr[tr.length - 1].e - first.s);
    const wps = wc / spokenSpan;
    if (wps >= 3) add("spoken.fast", `${wps.toFixed(1)} words/sec over ${spokenSpan.toFixed(0)}s`, "transcriptChunks", first.s, tr[tr.length - 1].e);
    const last = tr.slice(-2).map((c) => c.text).join(" ");
    const cta = last.match(/\b(follow|comment|save (this|it)|share|link in (my )?bio|subscribe|let me know|tag (a|your))\b[^.?!]{0,40}/i);
    if (cta) add("cta.engage", `“${cta[0]}”`, "transcriptChunks[-1]", tr[tr.length - 1].s);
  }

  // ON-SCREEN
  const fr = v.frames;
  const withText = fr.filter((f) => f.texts.length);
  if (fr.length) {
    if (!withText.length) add("text.none", "No on-screen text in any sampled frame", "frames[].onScreenTextRegions");
    else {
      const f0 = withText[0];
      if (f0.t <= 1.01) add("text.hook", `“${f0.texts.map((x) => x.text).join(" ").slice(0, 70)}” at ${f0.t.toFixed(1)}s`, "frames[].onScreenTextRegions", f0.t);
      if (withText.length / fr.length >= 0.6) add("text.heavy", `Text on ${withText.length}/${fr.length} frames`, "frames[].onScreenTextRegions");
      const allTxt = withText.flatMap((f) => f.texts.map((x) => x.text)).join(" ");
      const caps = withText.flatMap((f) => f.texts).find((x) => x.text.length >= 6 && x.text === x.text.toUpperCase() && /[A-Z]/.test(x.text));
      if (caps) add("text.caps", `“${caps.text.slice(0, 50)}”`, "onScreenTextRegions.text");
      const pov = withText.find((f) => f.texts.some((x) => /\b(pov|when you|me when|that moment|day \d+|me after)\b/i.test(x.text)));
      if (pov) add("text.pov", `“${pov.texts.map((x) => x.text).join(" ").slice(0, 60)}” at ${pov.t.toFixed(1)}s`, "onScreenTextRegions.text", pov.t);
      if (wc >= 8) {
        const sw = new Set(words(full));
        const ow = words(allTxt);
        const overlap = ow.filter((w) => sw.has(w)).length / Math.max(1, ow.length);
        if (ow.length >= 8 && overlap >= 0.5) add("text.captions", `${Math.round(overlap * 100)}% of overlay words match speech`, "onScreenText × transcript");
      }
    }
  }

  // SOUND
  if (v.audio.original) add("sound.original", v.audio.title || "Original sound", "audioTitle / audioAuthor");
  else if (v.audio.copyrighted || v.audio.title) add("sound.licensed", `${v.audio.title}${v.audio.author ? " — " + v.audio.author : ""}`, "audioTitle · audioCopyrighted");
  if (v.audio.title && !v.audio.original && trendingTitles.has(v.audio.title.toLowerCase())) add("sound.trending", `“${v.audio.title}” is reused across this niche`, "audioTitle");

  // FORMAT
  const d = v.duration;
  if (d > 0) {
    if (d < 10) add("len.snack", `${d.toFixed(0)}s`, "media.duration");
    else if (d < 30) add("len.short", `${d.toFixed(0)}s`, "media.duration");
    else if (d < 60) add("len.mid", `${d.toFixed(0)}s`, "media.duration");
    else add("len.long", `${d.toFixed(0)}s`, "media.duration");
  }
  const cl = v.caption.replace(/#\S+/g, "").trim().length;
  if (cl > 0 && cl < 60) add("caption.short", `${cl} chars`, "caption");
  if (cl >= 200) add("caption.story", `${cl} chars`, "caption");
  if (!v.hashtags.length) add("tags.none", "0 hashtags", "hashtags");
  if (v.hashtags.length >= 5) add("tags.many", `${v.hashtags.length} hashtags`, "hashtags");

  // VISUAL (filled by AI-Vision probes, stored on frames)
  const visBest = new Map<string, { t: number; score: number }>();
  for (const f of fr) for (const vv of f.vis || []) {
    const cur = visBest.get(vv.gene);
    if (!cur || vv.score > cur.score) visBest.set(vv.gene, { t: f.t, score: vv.score });
  }
  for (const [gene, b] of visBest) add(gene, `AI Vision match ${(b.score * 100).toFixed(0)}% at ${b.t.toFixed(1)}s`, "frames[].visualSimilarityScore", b.t);

  return hits;
}

// ─────────────────────────────────────────────────────────────────────────────
// Corpus statistics: which genes actually move views in THIS niche
// ─────────────────────────────────────────────────────────────────────────────
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function perf(v: SlimVideo, metric: NicheReport["metric"]) {
  return metric === "views/follower" ? v.vrf : v.views;
}

export function analyze(query: string, raw: SlimVideo[], source: NicheReport["source"], notes: string[] = []): NicheReport {
  // de-dupe
  const seen = new Set<string>();
  const corpus = raw.filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true)));

  // trending sounds = non-original titles reused ≥ 2 times in the corpus
  const counts = new Map<string, number>();
  for (const v of corpus) if (v.audio.title && !v.audio.original) counts.set(v.audio.title.toLowerCase(), (counts.get(v.audio.title.toLowerCase()) || 0) + 1);
  const trending = new Set([...counts].filter(([, n]) => n >= 2).map(([t]) => t));

  for (const v of corpus) v.genes = extractGenes(v, trending);

  const withFollowers = corpus.filter((v) => v.followers > 0 && v.vrf > 0).length;
  const metric: NicheReport["metric"] = withFollowers >= corpus.length * 0.7 ? "views/follower" : "views";
  const ranked = corpus.slice().sort((a, b) => perf(b, metric) - perf(a, metric));
  const q = Math.max(1, Math.floor(ranked.length / 4));
  const top = new Set(ranked.slice(0, q).map((v) => v.id));
  const bottom = new Set(ranked.slice(-q).map((v) => v.id));

  const stats: GeneStat[] = [];
  for (const g of GENES) {
    const has = corpus.filter((v) => v.genes.some((h) => h.id === g.id));
    const not = corpus.filter((v) => !v.genes.some((h) => h.id === g.id));
    if (has.length < 2 || not.length < 2) continue;
    const mw = median(has.map((v) => perf(v, metric)));
    const mo = median(not.map((v) => perf(v, metric)));
    const lift = mo > 0 ? mw / mo : 1;
    stats.push({
      ...g,
      n: has.length,
      share: Math.round((100 * has.length) / corpus.length),
      lift: Math.round(lift * 100) / 100,
      topShare: Math.round((100 * has.filter((v) => top.has(v.id)).length) / Math.max(1, q)),
      bottomShare: Math.round((100 * has.filter((v) => bottom.has(v.id)).length) / Math.max(1, q)),
      medianWith: mw,
      medianWithout: mo,
      examples: has.sort((a, b) => perf(b, metric) - perf(a, metric)).slice(0, 8).map((v) => v.id),
    });
  }
  stats.sort((a, b) => b.lift - a.lift);

  // Winning genome: best positive gene per track, mutually-exclusive groups respected
  const exclusive = [["len.snack", "len.short", "len.mid", "len.long"], ["sound.original", "sound.licensed"], ["text.none", "text.hook", "text.heavy", "text.captions"], ["spoken.silent", "spoken.fast", "spoken.instant"], ["tags.none", "tags.many"], ["caption.short", "caption.story"]];
  const winning: GeneStat[] = [];
  const order: Track[] = ["spoken", "visual", "onscreen", "sound", "format"];
  for (const tr of order) {
    const cands = stats.filter((s) => s.track === tr && s.lift > 1.05 && s.n >= 3);
    let taken = 0;
    for (const c of cands) {
      if (taken >= (tr === "format" || tr === "spoken" ? 2 : 1)) break;
      const grp = exclusive.find((e) => e.includes(c.id));
      if (grp && winning.some((w) => grp.includes(w.id))) continue;
      if (c.id === "spoken.silent" && winning.some((w) => w.track === "spoken")) continue;
      winning.push(c);
      taken++;
    }
  }

  const said = corpus.filter((v) => v.matched.includes("said")).length;
  const onscreen = corpus.filter((v) => v.matched.includes("onscreen")).length;
  const caption = corpus.filter((v) => v.matched.includes("caption")).length;
  const seenV = corpus.filter((v) => v.matched.includes("seen")).length;
  const captionOnlyFindable = caption;
  const hidden = corpus.filter((v) => v.matched.length && !v.matched.includes("caption")).length;

  return {
    query,
    source,
    fetchedAt: new Date().toISOString(),
    metric,
    corpus,
    genes: stats,
    winning,
    signalCounts: { said, onscreen, caption, seen: seenV, total: corpus.length, captionOnly: captionOnlyFindable, hiddenShare: corpus.length ? Math.round((100 * hidden) / corpus.length) : 0 },
    medianViews: median(corpus.map((v) => v.views)),
    totalViews: corpus.reduce((a, v) => a + v.views, 0),
    notes,
  };
}
