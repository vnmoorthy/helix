import { NextRequest, NextResponse } from "next/server";
import { nicheBrief } from "@/lib/engine";
import { llmProvider } from "@/lib/llm";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 80);
  if (!q) return NextResponse.json({ error: "Missing ?q=" }, { status: 400 });
  if (!llmProvider()) return NextResponse.json({ brief: null, reason: "No LLM key configured (set GMI_API_KEY)" });
  const brief = await nicheBrief(q);
  return NextResponse.json({ brief }, { headers: { "cache-control": "no-store" } });
}
