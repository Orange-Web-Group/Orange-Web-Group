import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { detect } from "@/lib/detector";
import { PLANS } from "@/lib/plans";
import { DetectRequest, checkLength } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

function validKey(given: string | null): boolean {
  if (!given) return false;
  const keys = (process.env.API_KEYS ?? "").split(",").map((k) => k.trim()).filter(Boolean);
  const g = Buffer.from(given);
  return keys.some((k) => {
    const b = Buffer.from(k);
    return b.length === g.length && timingSafeEqual(b, g);
  });
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const key = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : req.headers.get("x-api-key");
  if (!validKey(key)) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  }

  const body = DetectRequest.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Send JSON: { text: string, deep?: boolean }" }, { status: 400 });
  }
  const { error } = checkLength(body.data.text, PLANS.team.wordsPerScan);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const result = await detect(body.data.text, { deep: body.data.deep ?? true });
  return NextResponse.json(result);
}
