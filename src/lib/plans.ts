export type PlanId = "free" | "starter" | "pro" | "team";
export type BillingInterval = "monthly" | "annual";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** USD per month when billed monthly */
  monthly: number;
  /** USD per month when billed annually */
  annual: number;
  wordsPerMonth: number;
  wordsPerScan: number;
  deepScan: boolean;
  fileUpload: boolean;
  apiAccess: boolean;
  features: string[];
  highlight?: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Try it on everyday writing",
    monthly: 0,
    annual: 0,
    wordsPerMonth: 10_000,
    wordsPerScan: 2_000,
    deepScan: false,
    fileUpload: false,
    apiAccess: false,
    features: [
      "10,000 words per month",
      "Up to 2,000 words per scan",
      "Standard statistical scan",
      "Sentence-level highlighting",
      "Human / Mixed / AI verdict",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "For students and freelance writers",
    monthly: 9,
    annual: 7,
    wordsPerMonth: 150_000,
    wordsPerScan: 10_000,
    deepScan: false,
    fileUpload: true,
    apiAccess: false,
    features: [
      "150,000 words per month",
      "Up to 10,000 words per scan",
      "Everything in Free",
      "Upload .txt, .docx and .pdf files",
      "Scan history and report downloads",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "For educators, editors and agencies",
    monthly: 19,
    annual: 14,
    wordsPerMonth: 400_000,
    wordsPerScan: 25_000,
    deepScan: true,
    fileUpload: true,
    apiAccess: false,
    highlight: true,
    features: [
      "400,000 words per month",
      "Up to 25,000 words per scan",
      "Everything in Starter",
      "Deep Scan: AI-model review blended with statistics",
      "Written explanation of every verdict",
    ],
  },
  team: {
    id: "team",
    name: "Team",
    tagline: "For publishers and platforms at volume",
    monthly: 39,
    annual: 29,
    wordsPerMonth: 1_000_000,
    wordsPerScan: 50_000,
    deepScan: true,
    fileUpload: true,
    apiAccess: true,
    features: [
      "1,000,000 words per month",
      "Up to 50,000 words per scan",
      "Everything in Pro",
      "REST API access",
      "Priority email support",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "starter", "pro", "team"];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLANS;
}

export function annualSavingsPercent(plan: Plan): number {
  if (plan.monthly === 0) return 0;
  return Math.round((1 - plan.annual / plan.monthly) * 100);
}
