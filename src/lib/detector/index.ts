import { splitSentences, countWords } from "./text";
import { scoreStatistical, DocumentSignals } from "./stats";
import { runDeepScan, deepScanAvailable } from "./claude";

export type Verdict = "human" | "mixed" | "ai";

export interface SentenceResult {
  index: number;
  paragraph: number;
  text: string;
  aiProbability: number;
  markers: string[];
}

export interface DetectionResult {
  verdict: Verdict;
  /** Probability the document is primarily AI-written, 0..1 */
  aiProbability: number;
  /** Three-way breakdown that sums to 1 */
  breakdown: { human: number; mixed: number; ai: number };
  confidence: "low" | "medium" | "high";
  engine: "standard" | "deep";
  engineNote?: string;
  explanation: string;
  wordCount: number;
  signals: DocumentSignals;
  sentences: SentenceResult[];
}

export const MIN_WORDS = 40;

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const round = (x: number) => Math.round(x * 1000) / 1000;

export function verdictFrom(sentenceProbs: number[], docProb: number) {
  const n = Math.max(1, sentenceProbs.length);
  const aiShare = sentenceProbs.filter((p) => p >= 0.65).length / n;
  const humanShare = sentenceProbs.filter((p) => p <= 0.35).length / n;

  // "Mixed" is strongest when there are clear AI sentences AND clear human sentences.
  const mixed = clamp(4 * aiShare * humanShare);
  const ai = (1 - mixed) * docProb;
  const human = (1 - mixed) * (1 - docProb);

  let verdict: Verdict;
  if (mixed >= ai && mixed >= human) verdict = "mixed";
  else verdict = ai >= human ? "ai" : "human";

  return { verdict, breakdown: { human: round(human), mixed: round(mixed), ai: round(ai) } };
}

function confidenceFor(wordCount: number, docProb: number): DetectionResult["confidence"] {
  const margin = Math.abs(docProb - 0.5);
  if (wordCount < 120 || margin < 0.15) return "low";
  if (wordCount < 300 || margin < 0.3) return "medium";
  return "high";
}

function statExplanation(s: DocumentSignals, docProb: number): string {
  const reasons: string[] = [];
  if (s.burstiness < 0.35) reasons.push("sentence lengths are unusually uniform");
  else if (s.burstiness > 0.6) reasons.push("sentence lengths vary the way people naturally write");
  if (s.markerRate > 1) reasons.push("it uses several phrases common in AI-generated text");
  if (s.transitionRate > 0.2) reasons.push("many sentences open with formal transitions");
  if (s.contractionRate > 1.5 || s.informalRate > 1) reasons.push("it has informal, conversational markers");
  if (s.firstPersonRate > 2) reasons.push("it is written in a personal first-person voice");
  const lead =
    docProb >= 0.65
      ? "This text reads as likely AI-generated"
      : docProb <= 0.35
        ? "This text reads as likely human-written"
        : "The evidence here is mixed";
  return reasons.length
    ? `${lead}: ${reasons.slice(0, 3).join(", ")}.`
    : `${lead}. No single signal dominates, so treat this as an estimate.`;
}

export interface DetectOptions {
  deep: boolean;
}

export async function detect(text: string, opts: DetectOptions): Promise<DetectionResult> {
  const sentences = splitSentences(text);
  const wordCount = countWords(text);
  const stats = scoreStatistical(text, sentences);

  let sentenceProbs = stats.sentences.map((s) => s.aiProbability);
  let docProb = stats.aiProbability;
  let engine: DetectionResult["engine"] = "standard";
  let engineNote: string | undefined;
  let explanation = statExplanation(stats.signals, docProb);

  if (opts.deep && deepScanAvailable()) {
    try {
      const deep = await runDeepScan(sentences);
      const byIndex = new Map(deep.sentences.map((s) => [s.index, clamp(s.ai_probability)]));
      // Blend: the model's judgement leads, statistics stabilise it.
      sentenceProbs = sentenceProbs.map((p, i) => {
        const d = byIndex.get(i);
        return d === undefined ? p : 0.7 * d + 0.3 * p;
      });
      docProb = 0.7 * clamp(deep.overall_ai_probability) + 0.3 * docProb;
      explanation = deep.explanation;
      engine = "deep";
    } catch (err) {
      console.error("Deep Scan failed, falling back to standard engine:", err);
      engineNote = "Deep Scan was unavailable for this request, so the standard engine was used.";
    }
  } else if (opts.deep) {
    engineNote = "Deep Scan is not configured on this server, so the standard engine was used.";
  }

  // A detector should never claim certainty: keep every score within 1%..99%.
  docProb = clamp(docProb, 0.01, 0.99);
  sentenceProbs = sentenceProbs.map((p) => clamp(p, 0.01, 0.99));

  const { verdict, breakdown } = verdictFrom(sentenceProbs, docProb);

  return {
    verdict,
    aiProbability: round(docProb),
    breakdown,
    confidence: confidenceFor(wordCount, docProb),
    engine,
    engineNote,
    explanation,
    wordCount,
    signals: stats.signals,
    sentences: sentences.map((s, i) => ({
      index: s.index,
      paragraph: s.paragraph,
      text: s.text,
      aiProbability: round(sentenceProbs[i]),
      markers: stats.sentences[i].markers,
    })),
  };
}
