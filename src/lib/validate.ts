import { z } from "zod";
import { MIN_WORDS } from "./detector";
import { countWords } from "./detector/text";

export const DetectRequest = z.object({
  text: z.string().max(400_000),
  deep: z.boolean().optional(),
});

export function checkLength(text: string, wordsPerScan: number): { words: number; error?: string } {
  const words = countWords(text);
  if (words < MIN_WORDS) {
    return { words, error: `Please enter at least ${MIN_WORDS} words for a reliable result.` };
  }
  if (words > wordsPerScan) {
    return {
      words,
      error: `This text has ${words.toLocaleString()} words. Your plan allows ${wordsPerScan.toLocaleString()} words per scan.`,
    };
  }
  return { words };
}
