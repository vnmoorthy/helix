// Oriane REST client — https://connect.oriane.xyz/rest/docs
// Server-only. Auth header style is auto-detected (Bearer vs x-api-key) and cached.

const BASE = process.env.ORIANE_BASE_URL || "https://connect.oriane.xyz";

export type TextOperand = { values: string[]; operator?: "and" | "or" };
export type TextFilter = {
  exactMatch?: TextOperand;
  includesExactly?: TextOperand;
  includesFuzzy?: TextOperand;
  excludesExactly?: TextOperand;
  excludesFuzzy?: TextOperand;
  operator?: "and" | "or";
};
export type RangeFilter = { min?: number; max?: number };

export type ContentFilters = Partial<{
  id: { includes?: string[] };
  format: { includes?: ("image" | "video" | "carousel")[] };
  platform: { includes?: ("instagram" | "tiktok" | "youtube")[]; excludes?: string[] };
  profileHandle: TextFilter;
  caption: TextFilter;
  transcript: TextFilter;
  onScreenText: TextFilter;
  hashtags: TextFilter;
  audioTitle: TextFilter;
  mentionHandles: TextFilter;
  viewsCount: RangeFilter;
  profileFollowersCount: RangeFilter;
  publishedAt: { after?: string; before?: string };
  visualSimilarity: { includes?: { values: { assetId: string; minScore?: number; maxScore?: number }[]; operator?: "and" | "or" } };
}>;

export type ContentQuery = {
  name?: string;
  operator: "and" | "or";
  filters?: ContentFilters;
  queries?: ContentQuery[];
};

export type Frame = {
  id: string;
  position: number;
  timestampSeconds: number;
  url: string;
  visualSimilarityScore?: number;
  onScreenTextRegions?: { text: string; polygon: { x: number; y: number }[] }[] | null;
};

export type Media = {
  type: "image" | "video";
  duration: number;
  caption?: string;
  onScreenText?: string[] | null;
  transcript?: string;
  transcriptLanguage?: string;
  transcriptChunks?: { startSeconds: number; endSeconds: number; text: string }[];
  frames?: Frame[];
};

export type Content = {
  id: string;
  matchedQueries: string[];
  platform: "instagram" | "tiktok" | "youtube";
  platformId: string;
  profileHandle: string;
  profileDisplayName: string;
  profilePictureUrl?: string;
  profileFollowersCount: number;
  profileVerified?: boolean;
  profileBio?: string;
  title?: string;
  caption: string;
  hashtags: string[];
  mentions?: { profileHandle: string }[];
  publishedAt: string;
  thumbnailMediaUrl: string;
  viewsCount: number;
  likesCount: number;
  sharesCount: number;
  commentsCount: number;
  interactionsCount: number;
  engagementRatePerViews: number;
  engagementRatePerFollowers?: number;
  viewsRatePerFollowers?: number;
  audioTitle?: string;
  audioAuthor?: string;
  audioCopyrighted?: boolean;
  audioType?: string;
  media?: Media[];
  popularComments?: { profileHandle: string; content: string; likesCount: number }[];
};

export type SearchResult = {
  data: Content[];
  aggregations?: Record<string, number>;
  metadata: { requestId: string; executionTime: number; pagination?: { offset: number; limit: number; totalCount: number; aiSearchAnchor?: string } };
};

let authStyle: "bearer" | "x-api-key" | null = null;

function headers(key: string, style: "bearer" | "x-api-key") {
  const h: Record<string, string> = { "content-type": "application/json", accept: "application/json" };
  if (style === "bearer") h.authorization = `Bearer ${key}`;
  else h["x-api-key"] = key;
  return h;
}

export class OrianeError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

async function call<T>(path: string, body: unknown, key: string): Promise<T> {
  const styles: ("bearer" | "x-api-key")[] = authStyle ? [authStyle] : ["bearer", "x-api-key"];
  let last: OrianeError | null = null;
  for (const style of styles) {
    const res = await fetch(`${BASE}${path}`, { method: "POST", headers: headers(key, style), body: JSON.stringify(body), cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401 && !authStyle) {
      last = new OrianeError(401, "Oriane rejected the API key", json);
      continue;
    }
    if (!res.ok && res.status !== 206) {
      throw new OrianeError(res.status, json?.error?.message || `Oriane ${res.status}`, json);
    }
    authStyle = style;
    return json as T;
  }
  throw last || new OrianeError(401, "Oriane auth failed");
}

export function orianeKey(): string | null {
  return process.env.ORIANE_API_KEY || null;
}

export async function searchContents(
  query: ContentQuery,
  opts: { limit?: number; offset?: number; sort?: string; projection?: "basic" | "default" | "full"; key?: string } = {},
): Promise<SearchResult> {
  const key = opts.key || orianeKey();
  if (!key) throw new OrianeError(0, "No ORIANE_API_KEY configured");
  const qs = new URLSearchParams();
  qs.set("limit", String(opts.limit ?? 20));
  if (opts.offset) qs.set("offset", String(opts.offset));
  if (opts.sort) qs.set("sort", opts.sort);
  qs.set("projection", opts.projection ?? "full");
  const raw = await call<{ data: Content[] | { results: Content[]; aggregations?: Record<string, number> }; metadata: SearchResult["metadata"] }>(`/rest/contents/search?${qs}`, query, key);
  const list = Array.isArray(raw.data) ? raw.data : raw.data?.results || [];
  const aggregations = Array.isArray(raw.data) ? undefined : raw.data?.aggregations;
  return { data: list, metadata: raw.metadata, aggregations };
}

export async function createTextAsset(text: string, key?: string): Promise<string> {
  const k = key || orianeKey();
  if (!k) throw new OrianeError(0, "No ORIANE_API_KEY configured");
  const r = await call<{ data: { id: string } }>(`/rest/assets`, { type: "text", text }, k);
  return r.data.id;
}

export async function createImageAsset(url: string, key?: string): Promise<string> {
  const k = key || orianeKey();
  if (!k) throw new OrianeError(0, "No ORIANE_API_KEY configured");
  const r = await call<{ data: { id: string } }>(`/rest/assets`, { type: "image", image: { type: "url", url } }, k);
  return r.data.id;
}
