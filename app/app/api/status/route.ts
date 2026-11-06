import { NextResponse } from "next/server";
import { status, listCached } from "@/lib/engine";


export async function GET() {
  return NextResponse.json({ ...status(), cached: await listCached() });
}
