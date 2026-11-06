import { NextRequest, NextResponse } from "next/server";
import { llmFork, type ForkInput } from "@/lib/fork";


export async function POST(req: NextRequest) {
  const body = (await req.json()) as ForkInput;
  if (!body?.product || !body?.genes?.length) return NextResponse.json({ error: "product and genes are required" }, { status: 400 });
  const plan = await llmFork({ ...body, creator: body.creator || "you", niche: body.niche || "your niche" });
  return NextResponse.json(plan);
}
