import { NextResponse } from "next/server";
import { z } from "zod";
import { getStripe, priceIdFor, appUrl } from "@/lib/stripe";

export const runtime = "nodejs";

const Body = z.object({
  plan: z.enum(["starter", "pro", "team"]),
  interval: z.enum(["monthly", "annual"]),
});

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const stripe = getStripe();
  const price = priceIdFor(body.data.plan, body.data.interval);
  if (!stripe || !price) {
    return NextResponse.json(
      { error: "Billing isn't configured yet. Add your Stripe keys and price IDs to enable checkout." },
      { status: 503 },
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    metadata: { plan: body.data.plan },
    subscription_data: { metadata: { plan: body.data.plan } },
    success_url: `${appUrl()}/api/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/pricing?canceled=1`,
  });

  return NextResponse.json({ url: session.url });
}
