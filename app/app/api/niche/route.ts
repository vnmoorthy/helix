import { NextRequest, NextResponse } from "next/server";
import { nicheReport } from "@/lib/engine";

export const maxDuration = 300;

// Simple per-IP rate limit on LIVE re-sequencing (cached reads are free).
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 6;
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 80);
  if (!q) return NextResponse.json({ error: "Missing ?q=" }, { status: 400 });
  const fresh = req.nextUrl.searchParams.get("fresh") === "1";
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  if (limited(ip)) return NextResponse.json({ error: "Easy, tiger — too many sequences in a minute. Try again shortly." }, { status: 429 });
  const report = await nicheReport(q, { fresh });
  return NextResponse.json(report, { headers: { "cache-control": "no-store" } });
}
