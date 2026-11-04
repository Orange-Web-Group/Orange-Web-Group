import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API | TrueDraft",
  description: "Add AI writing detection to your product with the TrueDraft REST API.",
};

const REQUEST = `curl -X POST https://YOUR-DOMAIN/api/v1/detect \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Paste at least 40 words here...", "deep": true}'`;

const RESPONSE = `{
  "verdict": "mixed",              // "human" | "mixed" | "ai"
  "aiProbability": 0.58,           // 0..1, document is primarily AI-written
  "breakdown": { "human": 0.21, "mixed": 0.49, "ai": 0.30 },
  "confidence": "medium",          // "low" | "medium" | "high"
  "engine": "deep",                // "standard" | "deep"
  "explanation": "The opening paragraph uses ...",
  "wordCount": 412,
  "signals": { "burstiness": 0.31, "markerRate": 1.2, ... },
  "sentences": [
    { "index": 0, "paragraph": 0, "text": "...", "aiProbability": 0.82, "markers": ["delve"] }
  ]
}`;

export default function DevelopersPage() {
  return (
    <div className="container">
      <article className="prose">
        <span className="eyebrow">Developers</span>
        <h1>TrueDraft API</h1>
        <p>
          One endpoint, JSON in and JSON out. API access is included on the <Link href="/pricing">Team plan</Link>.
        </p>

        <h2>Authentication</h2>
        <p>
          Send your key as <code>Authorization: Bearer &lt;key&gt;</code> (or an <code>x-api-key</code> header).
        </p>

        <h2>Detect</h2>
        <p>
          <code>POST /api/v1/detect</code> with a body of <code>{"{ text: string, deep?: boolean }"}</code>. Text must be
          40 to 50,000 words. <code>deep</code> defaults to <code>true</code> and falls back to the standard engine if Deep
          Scan is unavailable.
        </p>
        <pre><code>{REQUEST}</code></pre>

        <h2>Response</h2>
        <pre><code>{RESPONSE}</code></pre>

        <h2>Errors</h2>
        <ul>
          <li><code>400</code>: invalid body or text outside the allowed length</li>
          <li><code>401</code>: missing or invalid API key</li>
          <li><code>500</code>: unexpected error; safe to retry</li>
        </ul>

        <h2>Interpreting scores</h2>
        <p>
          Treat <code>aiProbability</code> as evidence, not proof. Use <code>confidence</code> and the per-sentence scores to
          decide whether a human should review. See <Link href="/accuracy">how detection works</Link>.
        </p>
      </article>
    </div>
  );
}
