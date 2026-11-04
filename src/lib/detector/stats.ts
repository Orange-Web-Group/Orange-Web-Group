import { Sentence, words } from "./text";

/**
 * Statistical (zero-cost) detector.
 *
 * Large language models tend to write sentences of very even length, reach for
 * a recognisable set of stock phrases and transitions, and rarely use the
 * informal markers people use (contractions, first person, typos, asides).
 * None of these signals is proof on its own; together they give a useful,
 * explainable estimate. Deep Scan (claude.ts) is blended on top when enabled.
 */

// Phrases that show up far more often in LLM output than in human writing.
export const AI_MARKERS = [
  "delve", "delves", "delving", "tapestry", "testament to", "in today's fast-paced",
  "in today's digital", "ever-evolving", "ever-changing", "navigate the complexities",
  "navigating the", "it is important to note", "it's important to note", "it is worth noting",
  "it's worth noting", "plays a crucial role", "plays a pivotal role", "pivotal", "crucial role",
  "a myriad of", "myriad", "multifaceted", "holistic", "seamless", "seamlessly", "leverage",
  "leveraging", "robust", "foster", "fostering", "underscore", "underscores", "showcasing",
  "showcases", "embark", "realm", "landscape", "paramount", "intricate", "intricacies",
  "elevate", "unlock the", "unleash", "harness the power", "game-changer", "in conclusion",
  "in summary", "overall,", "ultimately,", "by doing so", "not only", "serves as a",
  "stands as a", "a deeper understanding", "rich history", "vibrant", "nuanced",
  "comprehensive", "furthermore", "moreover", "additionally", "notably", "consequently",
];

const TRANSITION_STARTS = [
  "additionally", "furthermore", "moreover", "overall", "ultimately", "in conclusion",
  "in summary", "however", "consequently", "notably", "importantly", "as a result",
  "in addition", "first", "firstly", "secondly", "finally", "lastly", "by", "whether",
];

const CONTRACTION_RE = /\b\w+'(s|t|re|ve|ll|d|m)\b/gi;
const FIRST_PERSON_RE = /\b(i|i'm|i've|i'd|me|my|mine)\b/gi;
const TRIPLET_RE = /\b[\w-]+(?: [\w-]+)?, [\w-]+(?: [\w-]+)?,? and [\w-]+/gi;
const INFORMAL_RE = /(!|\?|\.\.\.|\(|\)|\blol\b|\bhaha\b|\bkinda\b|\bgonna\b|\bwanna\b|\byeah\b|\bok\b|\bokay\b)/gi;

export interface DocumentSignals {
  /** Coefficient of variation of sentence length. Low = suspiciously uniform. */
  burstiness: number;
  meanSentenceLength: number;
  /** Stock AI phrases per 100 words */
  markerRate: number;
  /** Sentences opening with a formal transition, as a fraction */
  transitionRate: number;
  contractionRate: number;
  firstPersonRate: number;
  informalRate: number;
  /** "X, Y, and Z" lists per sentence */
  tripletRate: number;
  /** Moving-average type/token ratio over 50 word windows */
  lexicalDiversity: number;
}

export interface StatSentenceScore {
  index: number;
  aiProbability: number;
  markers: string[];
}

export interface StatResult {
  aiProbability: number;
  signals: DocumentSignals;
  sentences: StatSentenceScore[];
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

function count(re: RegExp, text: string): number {
  return (text.match(re) ?? []).length;
}

export function findMarkers(text: string): string[] {
  const lower = text.toLowerCase();
  return AI_MARKERS.filter((m) => {
    if (m.endsWith(",")) return lower.includes(m);
    return new RegExp(`\\b${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lower);
  });
}

function startsWithTransition(text: string): boolean {
  const lower = text.toLowerCase().replace(/^["'(\[]/, "");
  return TRANSITION_STARTS.some((t) => lower.startsWith(t + ",") || lower.startsWith(t + " "))
    && /^[^,]{0,25},/.test(lower);
}

function mattr(tokens: string[], window = 50): number {
  if (tokens.length === 0) return 0;
  if (tokens.length <= window) return new Set(tokens).size / tokens.length;
  let total = 0;
  let n = 0;
  for (let i = 0; i + window <= tokens.length; i += 5) {
    total += new Set(tokens.slice(i, i + window)).size / window;
    n++;
  }
  return total / n;
}

export function documentSignals(text: string, sentences: Sentence[]): DocumentSignals {
  const tokens = words(text).map((w) => w.toLowerCase());
  const n = Math.max(1, tokens.length);
  const lengths = sentences.map((s) => s.words).filter((w) => w > 0);
  const mean = lengths.reduce((a, b) => a + b, 0) / Math.max(1, lengths.length);
  const variance =
    lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, lengths.length);
  const markerHits = sentences.reduce((a, s) => a + findMarkers(s.text).length, 0);

  return {
    burstiness: mean > 0 ? Math.sqrt(variance) / mean : 0,
    meanSentenceLength: mean,
    markerRate: (markerHits / n) * 100,
    transitionRate:
      sentences.filter((s) => startsWithTransition(s.text)).length / Math.max(1, sentences.length),
    contractionRate: (count(CONTRACTION_RE, text) / n) * 100,
    firstPersonRate: (count(FIRST_PERSON_RE, text) / n) * 100,
    informalRate: (count(INFORMAL_RE, text) / n) * 100,
    tripletRate: count(TRIPLET_RE, text) / Math.max(1, sentences.length),
    lexicalDiversity: mattr(tokens),
  };
}

/**
 * Hand-tuned logistic model. Each term is centred on a value that sits between
 * typical human and typical model writing, so z near 0 means "can't tell".
 */
function documentLogit(s: DocumentSignals, sentenceCount: number): number {
  let z = 0;
  z += (0.45 - s.burstiness) * 6; // uniform sentence length pushes toward AI
  z += (s.markerRate - 0.6) * 1.4; // stock phrases
  z += (s.transitionRate - 0.12) * 5; // formal transitions
  z += (s.tripletRate - 0.12) * 3; // rule-of-three lists
  z -= (s.contractionRate - 1.0) * 0.7; // contractions read as human
  z -= (s.firstPersonRate - 1.0) * 0.35;
  z -= (s.informalRate - 0.6) * 0.9;
  // Very long, very even sentences are a classic model pattern.
  if (s.meanSentenceLength > 18 && s.burstiness < 0.4) z += 0.6;
  // Short inputs carry little evidence: shrink toward 0 (uncertain).
  const confidence = clamp(sentenceCount / 8, 0.25, 1);
  return z * confidence;
}

export function scoreStatistical(text: string, sentences: Sentence[]): StatResult {
  const signals = documentSignals(text, sentences);
  const docZ = documentLogit(signals, sentences.length);
  const aiProbability = sigmoid(docZ);
  const mean = signals.meanSentenceLength || 1;

  const scored = sentences.map((s) => {
    const markers = findMarkers(s.text);
    let z = docZ * 0.7; // sentences inherit most of the document's evidence
    z += markers.length * 0.55;
    if (startsWithTransition(s.text)) z += 0.6;
    if (TRIPLET_RE.test(s.text)) z += 0.35;
    TRIPLET_RE.lastIndex = 0;
    if (count(CONTRACTION_RE, s.text) > 0) z -= 0.6;
    if (count(FIRST_PERSON_RE, s.text) > 0) z -= 0.3;
    if (count(INFORMAL_RE, s.text) > 0) z -= 0.5;
    // Sentences close to the average length look "machine even"; outliers look human.
    const dev = Math.abs(s.words - mean) / mean;
    z += (0.35 - dev) * 0.9;
    if (s.words <= 4) z -= 0.6;
    return { index: s.index, aiProbability: sigmoid(z), markers };
  });

  return { aiProbability, signals, sentences: scored };
}
