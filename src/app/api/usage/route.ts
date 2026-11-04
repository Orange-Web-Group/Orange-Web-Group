import { NextResponse } from "next/server";
import { readSession, usageSummary } from "@/lib/usage";
import { deepScanAvailable } from "@/lib/detector/claude";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readSession();
  return NextResponse.json({ usage: usageSummary(session), deepScanConfigured: deepScanAvailable() });
}
