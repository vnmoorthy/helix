import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";


// Local-only convenience: paste your Oriane key in the UI instead of editing .env.local.
export async function POST(req: NextRequest) {
  const host = req.headers.get("host") || "";
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) && process.env.HELIX_ALLOW_KEY_UI !== "1")
    return NextResponse.json({ error: "Key UI is only enabled on localhost" }, { status: 403 });
  const { key } = (await req.json()) as { key?: string };
  if (!key || key.length < 10) return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  process.env.ORIANE_API_KEY = key.trim();
  try {
    const file = path.join(process.cwd(), ".env.local");
    let env = "";
    try { env = await fs.readFile(file, "utf8"); } catch {}
    env = env.split("\n").filter((l) => !l.startsWith("ORIANE_API_KEY=")).join("\n").trim();
    await fs.writeFile(file, `${env ? env + "\n" : ""}ORIANE_API_KEY=${key.trim()}\n`);
  } catch {}
  return NextResponse.json({ ok: true });
}
