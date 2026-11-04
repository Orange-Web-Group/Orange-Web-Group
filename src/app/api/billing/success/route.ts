import { NextResponse } from "next/server";
import { getStripe, appUrl } from "@/lib/stripe";
import { isPlanId } from "@/lib/plans";
import { readSession, writeSession } from "@/lib/usage";

export const runtime = "nodejs";

/** Stripe redirects here after checkout. Verify server-side, then grant the plan. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("session_id");
  const stripe = getStripe();
  if (!id || !stripe) return NextResponse.redirect(`${appUrl()}/pricing`);

  const checkout = await stripe.checkout.sessions.retrieve(id).catch(() => null);
  const plan = checkout?.metadata?.plan;
  if (!checkout || checkout.status !== "complete" || !isPlanId(plan)) {
    return NextResponse.redirect(`${appUrl()}/pricing?error=checkout`);
  }

  const session = await readSession();
  await writeSession({
    ...session,
    plan,
    stripeCustomer: typeof checkout.customer === "string" ? checkout.customer : undefined,
  });
  return NextResponse.redirect(`${appUrl()}/?upgraded=${plan}`);
}
