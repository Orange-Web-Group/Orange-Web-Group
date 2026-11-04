import Link from "next/link";
import Detector from "@/components/Detector";

const FEATURES = [
  {
    title: "Sentence-level highlighting",
    body: "See exactly which sentences read as machine-written, with a probability on every line instead of a single opaque number.",
  },
  {
    title: "Human, Mixed or AI",
    body: "Real documents are often part human, part AI. A three-way verdict tells you when someone has pasted or edited model output.",
  },
  {
    title: "Explainable signals",
    body: "Burstiness, stock phrasing, formal transitions and voice are surfaced so you can understand and defend every result.",
  },
  {
    title: "Deep Scan",
    body: "Pro plans add a second opinion from a frontier AI model, blended with statistical signals for sharper, more stable scores.",
  },
  {
    title: "Files and reports",
    body: "Upload .docx, .pdf or .txt files and download a shareable HTML report with highlights and the verdict.",
  },
  {
    title: "Developer API",
    body: "Plug detection into your LMS, CMS or moderation pipeline with a single JSON endpoint.",
  },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ upgraded?: string }> }) {
  const { upgraded } = await searchParams;
  return (
    <>
      <div className="container">
        {upgraded && (
          <div className="alert" style={{ marginTop: 20 }}>
            Welcome to {upgraded.charAt(0).toUpperCase() + upgraded.slice(1)}. Your new limits are active.
          </div>
        )}
        <section className="hero">
          <span className="eyebrow">AI writing detector</span>
          <h1>Was this written by a person or by AI?</h1>
          <p>
            Paste any text and TrueDraft shows you a clear verdict, a probability breakdown, and which sentences look
            machine-generated.
          </p>
        </section>
        <Detector />
      </div>

      <section className="section">
        <div className="container">
          <h2>Built for people who need to trust what they read</h2>
          <p className="lede">Teachers, editors, recruiters and publishers use TrueDraft to review writing fairly and quickly.</p>
          <div className="features">
            {FEATURES.map((f) => (
              <div key={f.title} className="card feature">
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ textAlign: "center" }}>
          <h2>Start free. Upgrade when you need more.</h2>
          <p className="lede">10,000 words a month free, no account needed. Paid plans start at $7/month billed annually.</p>
          <Link href="/pricing" className="btn btn-primary">Compare plans</Link>
        </div>
      </section>
    </>
  );
}
