import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How AI Detection Works | TrueDraft",
  description: "What TrueDraft measures, how scores are calculated, and how to use AI detection results responsibly.",
};

export default function AccuracyPage() {
  return (
    <div className="container">
      <article className="prose">
        <span className="eyebrow">Methodology</span>
        <h1>How TrueDraft detects AI writing</h1>
        <p>
          AI detection is a probability, not a certainty. This page explains what we measure, so you can judge results
          for yourself.
        </p>

        <h2>The standard engine</h2>
        <p>Every scan runs a statistical analysis of the writing itself:</p>
        <ul>
          <li>
            <strong>Burstiness.</strong> People mix long and short sentences. Language models tend to write sentences of
            very similar length.
          </li>
          <li>
            <strong>Stock phrasing.</strong> Certain words and phrases (&quot;delve&quot;, &quot;it is important to
            note&quot;, &quot;in today&apos;s fast-paced world&quot;) appear far more often in AI output.
          </li>
          <li>
            <strong>Formal transitions and lists of three.</strong> Sentences opening with &quot;Furthermore,&quot; or
            &quot;Additionally,&quot; and tidy three-item lists are common model habits.
          </li>
          <li>
            <strong>Voice.</strong> Contractions, first-person detail, questions and informal asides point toward a
            human writer.
          </li>
        </ul>
        <p>These signals are combined into a document score, and every sentence gets its own score on top of it.</p>

        <h2>Deep Scan</h2>
        <p>
          On Pro and Team plans, Deep Scan also asks a frontier AI model to review each sentence the way an experienced
          editor would, looking at specificity, rhythm and reasoning. Its judgement is blended with the statistical
          score (70/30), which makes results more stable on edited and mixed documents.
        </p>

        <h2>Human, Mixed or AI</h2>
        <p>
          A document is labelled <em>Mixed</em> when it contains both clearly human and clearly AI-like sentences, which
          is typical when model output has been pasted into or edited alongside original writing.
        </p>

        <h2>Known limitations</h2>
        <ul>
          <li>Short texts (under about 150 words) carry little evidence, so confidence is reported as low.</li>
          <li>Very formal or formulaic human writing (legal, technical, some non-native English) can score higher.</li>
          <li>Heavily paraphrased or carefully edited AI text can score lower.</li>
        </ul>

        <h2>Using results responsibly</h2>
        <p>
          Use a TrueDraft score to start a conversation, not to end one. We do not recommend using any AI detector as the
          sole basis for academic penalties or hiring decisions. Look at the highlighted sentences, the confidence level
          and the writer&apos;s other work.
        </p>
        <p>
          <Link href="/">Try the detector →</Link>
        </p>
      </article>
    </div>
  );
}
