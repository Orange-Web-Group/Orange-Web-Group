import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { PLANS, PlanId, isPlanId } from "./plans";

/**
 * Lightweight, account-free plan + usage tracking stored in an HMAC-signed
 * cookie. Good enough for launch; move to a database with user accounts before
 * relying on it for billing enforcement at scale (cookies can be cleared).
 */

export const USAGE_COOKIE = "td_session";

export interface SessionState {
  plan: PlanId;
  month: string; // YYYY-MM
  wordsUsed: number;
  stripeCustomer?: string;
}

function secret(): string {
  const s = process.env.APP_SECRET;
  if (!s && process.env.NODE_ENV === "production") {
    throw new Error("APP_SECRET must be set in production");
  }
  return s ?? "dev-only-insecure-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function currentMonth(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}

function defaultPlan(): PlanId {
  const p = process.env.DEFAULT_PLAN;
  return isPlanId(p) ? p : "free";
}

export function encodeSession(state: SessionState): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(raw: string | undefined): SessionState | null {
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!isPlanId(parsed.plan) || typeof parsed.wordsUsed !== "number") return null;
    return parsed as SessionState;
  } catch {
    return null;
  }
}

export async function readSession(): Promise<SessionState> {
  const jar = await cookies();
  const state = decodeSession(jar.get(USAGE_COOKIE)?.value);
  const month = currentMonth();
  if (!state) return { plan: defaultPlan(), month, wordsUsed: 0 };
  // Paid plans persist; a default-plan override applies to free visitors.
  const plan = state.plan === "free" ? defaultPlan() : state.plan;
  if (state.month !== month) return { ...state, plan, month, wordsUsed: 0 };
  return { ...state, plan };
}

export async function writeSession(state: SessionState): Promise<void> {
  const jar = await cookies();
  jar.set(USAGE_COOKIE, encodeSession(state), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
}

export function usageSummary(state: SessionState) {
  const plan = PLANS[state.plan];
  return {
    plan: plan.id,
    planName: plan.name,
    wordsUsed: state.wordsUsed,
    wordsPerMonth: plan.wordsPerMonth,
    wordsPerScan: plan.wordsPerScan,
    remaining: Math.max(0, plan.wordsPerMonth - state.wordsUsed),
    deepScan: plan.deepScan,
    fileUpload: plan.fileUpload,
  };
}

export type UsageSummary = ReturnType<typeof usageSummary>;
