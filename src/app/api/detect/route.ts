import { NextResponse } from "next/server";
import { detect } from "@/lib/detector";
import { PLANS } from "@/lib/plans";
import { readSession, writeSession, usageSummary } from "@/lib/usage";
import { DetectRequest, checkLength } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = DetectRequest.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Send JSON: { text: string, deep?: boolean }" }, { status: 400 });
  }

  const session = await readSession();
  const plan = PLANS[session.plan];
  const { words, error } = checkLength(body.data.text, plan.wordsPerScan);
  if (error) return NextResponse.json({ error }, { status: 400 });

  if (session.wordsUsed + words > plan.wordsPerMonth) {
    return NextResponse.json(
      {
        error: `You've reached your ${plan.wordsPerMonth.toLocaleString()} word monthly limit on the ${plan.name} plan. Upgrade for more.`,
        upgrade: true,
      },
      { status: 402 },
    );
  }

  const wantsDeep = body.data.deep ?? plan.deepScan;
  const result = await detect(body.data.text, { deep: wantsDeep && plan.deepScan });

  const next = { ...session, wordsUsed: session.wordsUsed + words };
  await writeSession(next);

  return NextResponse.json({ result, usage: usageSummary(next) });
}
