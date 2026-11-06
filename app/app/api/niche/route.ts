import { NextRequest, NextResponse } from "next/server";
import { nicheReport } from "@/lib/engine";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ error: "Missing ?q=" }, { status: 400 });
  const fresh = req.nextUrl.searchParams.get("fresh") === "1";
  const report = await nicheReport(q, { fresh });
  return NextResponse.json(report);
}
