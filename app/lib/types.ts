export type Track = "spoken" | "onscreen" | "sound" | "visual" | "format";

export type GeneHit = {
  id: string; // gene id from catalog
  t?: number; // seconds where the gene is observed
  tEnd?: number;
  evidence: string; // human-readable proof
  field: string; // Oriane field it came from
};

export type SlimFrame = {
  t: number;
  url: string;
  texts: { text: string; poly: { x: number; y: number }[] }[];
  vis?: { gene: string; score: number }[];
};

export type SlimVideo = {
  id: string;
  platform: "instagram" | "tiktok" | "youtube";
  link: string;
  handle: string;
  displayName: string;
  avatar?: string;
  followers: number;
  verified?: boolean;
  caption: string;
  hashtags: string[];
  publishedAt: string;
  thumb: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  er: number; // engagement rate per views, %
  vrf: number; // views per follower, %
  duration: number;
  audio: { title: string; author: string; original: boolean; copyrighted: boolean };
  transcript: { s: number; e: number; text: string }[];
  frames: SlimFrame[];
  matched: string[]; // which Oriane named sub-queries matched (said / onscreen / caption / seen)
  genes: GeneHit[];
};

export type GeneDef = {
  id: string;
  label: string;
  track: Track;
  blurb: string;
  // how to reproduce this gene in a fork
  recipe: string;
};

export type GeneStat = {
  id: string;
  label: string;
  track: Track;
  blurb: string;
  recipe: string;
  n: number; // videos carrying gene
  share: number; // % of corpus
  lift: number; // median perf with / without
  topShare: number; // % of top-quartile videos carrying it
  bottomShare: number; // % of bottom-quartile videos carrying it
  medianWith: number;
  medianWithout: number;
  examples: string[]; // video ids, best first
};

export type Brief = {
  headline: string;
  moves: string[];
  avoid: string;
  hooks: string[];
  via: string; // e.g. "GMI Cloud · DeepSeek-V4.1-Flash"
  generatedAt: string;
};

export type NicheReport = {
  query: string;
  source: "live" | "cache" | "sample";
  fetchedAt: string;
  metric: "views/follower" | "views";
  corpus: SlimVideo[];
  genes: GeneStat[];
  winning: GeneStat[]; // the winning genome: one strongest gene per slot
  signalCounts: { said: number; onscreen: number; caption: number; seen: number; total: number; captionOnly: number; hiddenShare: number };
  medianViews: number;
  totalViews: number;
  notes: string[];
  brief?: Brief | null;
};

export type ForkBeat = {
  slot: string;
  start: number;
  end: number;
  shot: string;
  say: string;
  onscreen: string;
  sound: string;
  genes: string[]; // inherited gene ids
  swapped: string; // what content is swapped vs the source
};

export type ForkPlan = {
  title: string;
  product: string;
  creator: string;
  style: string;
  duration: number;
  beats: ForkBeat[];
  caption: string;
  hashtags: string[];
  predictedLift: number;
  engine: string; // "helix-template" or the LLM label, e.g. "GMI Cloud · DeepSeek-V4.1-Flash"
  sourceVideoId?: string;
};
