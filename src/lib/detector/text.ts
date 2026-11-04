export interface Sentence {
  index: number;
  paragraph: number;
  text: string;
  words: number;
}

const WORD_RE = /[A-Za-z0-9À-ɏ']+/g;

export function words(text: string): string[] {
  return text.match(WORD_RE) ?? [];
}

export function countWords(text: string): number {
  return words(text).length;
}

/**
 * Split text into sentences while remembering which paragraph each belongs to,
 * so the UI can re-render the document with its original paragraph breaks.
 */
export function splitSentences(text: string): Sentence[] {
  const paragraphs = text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n|\n(?=\s*[-*•\d]+[.)]?\s)/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const out: Sentence[] = [];
  paragraphs.forEach((para, p) => {
    // Break after . ! ? (optionally followed by quotes/brackets) when the next
    // token looks like the start of a sentence. Avoids splitting "e.g. this".
    const parts = para.split(/(?<=[.!?]["')\]]?)\s+(?=["'(\[]?[A-Z0-9])/);
    for (const raw of parts) {
      const t = raw.trim();
      if (!t) continue;
      out.push({ index: out.length, paragraph: p, text: t, words: countWords(t) });
    }
  });
  return out;
}
