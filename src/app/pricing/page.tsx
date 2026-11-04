import type { Metadata } from "next";
import PricingTable from "@/components/PricingTable";
import { PLANS, PLAN_ORDER, PlanId } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing | TrueDraft",
  description:
    "Simple plans for AI writing detection. Start free, upgrade for more words, Deep Scan, file uploads and API access.",
};

const yes = "✓";
const no = "–";

const ROWS: { label: string; value: (id: PlanId) => string }[] = [
  { label: "Words per month", value: (id) => PLANS[id].wordsPerMonth.toLocaleString() },
  { label: "Words per scan", value: (id) => PLANS[id].wordsPerScan.toLocaleString() },
  { label: "Sentence highlighting", value: () => yes },
  { label: "Human / Mixed / AI verdict", value: () => yes },
  { label: "File upload (.docx, .pdf, .txt)", value: (id) => (PLANS[id].fileUpload ? yes : no) },
  { label: "Downloadable reports", value: (id) => (PLANS[id].fileUpload ? yes : no) },
  { label: "Deep Scan (AI-model review)", value: (id) => (PLANS[id].deepScan ? yes : no) },
  { label: "REST API", value: (id) => (PLANS[id].apiAccess ? yes : no) },
];

const FAQ = [
  {
    q: "How accurate is AI detection?",
    a: "No detector is perfect, ours included. TrueDraft gives a probability, a confidence level and sentence-level evidence so you can make an informed judgement. Results on short texts (under about 150 words) are less reliable, and we never recommend using a score as the only basis for an academic or employment decision.",
  },
  {
    q: "What is Deep Scan?",
    a: "Deep Scan sends the text to a frontier AI model that reviews each sentence the way an experienced editor would. Its judgement is blended with our statistical signals, which tends to give sharper and more stable results, especially on mixed documents.",
  },
  {
    q: "Do you store my text?",
    a: "Text is processed to produce your result and is not saved on our servers. Your recent scans are kept only in your own browser so you can reopen them.",
  },
  {
    q: "What happens when I hit my word limit?",
    a: "Scans pause until your allowance resets at the start of the next calendar month, or you can upgrade at any time for a higher limit.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Monthly plans can be cancelled at any time and stay active until the end of the billing period. Annual plans are billed once per year at a discount.",
  },
];

export default function PricingPage() {
  return (
    <div className="container" style={{ paddingBottom: 56 }}>
      <section className="hero">
        <span className="eyebrow">Pricing</span>
        <h1>Plans that scale with your workload</h1>
        <p>Start free with no account. Upgrade for more words, Deep Scan and file uploads.</p>
      </section>

      <PricingTable />

      <div className="table-wrap">
        <table className="compare">
          <thead>
            <tr>
              <th>Compare plans</th>
              {PLAN_ORDER.map((id) => (
                <th key={id}>{PLANS[id].name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                {PLAN_ORDER.map((id) => (
                  <td key={id}>{r.value(id)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="section" style={{ marginTop: 56 }}>
        <h2>Frequently asked questions</h2>
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
