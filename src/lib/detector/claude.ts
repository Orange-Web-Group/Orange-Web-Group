import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Sentence } from "./text";

/**
 * Deep Scan engine: asks Claude to judge each sentence. Used only when
 * ANTHROPIC_API_KEY is set and the visitor's plan includes Deep Scan.
 */

const DeepScanSchema = z.object({
  overall_ai_probability: z.number(),
  verdict: z.enum(["human", "mixed", "ai"]),
  explanation: z.string(),
  sentences: z.array(
    z.object({
      index: z.number().int(),
      ai_probability: z.number(),
    }),
  ),
});

export type DeepScanOutput = z.infer<typeof DeepScanSchema>;

const SYSTEM_PROMPT = `You are the analysis engine of an AI-writing detector used by teachers, editors and publishers.
You receive a document split into numbered sentences. Estimate, for each sentence, the probability (0 to 1) that it was produced by a large language model rather than written by a person.

Weigh evidence the way an expert reviewer would:
- Model writing: evenly sized sentences, generic claims without concrete specifics, stock phrasing and transitions, tidy lists of three, hedged balanced conclusions, no personal detail or errors.
- Human writing: uneven rhythm, specific names/numbers/anecdotes, opinions, informal asides, idiosyncratic word choice, small mistakes.
- A document can be mixed: people often paste model output into their own writing, or edit it. Judge sentences individually.

Be calibrated: use values near 0.5 when evidence is weak, and do not let topic or formality alone decide the score. Polished human writing exists.
Return one entry per sentence index you were given. The explanation is 2-3 plain sentences for the end user, citing the strongest signals you saw.`;

let client: Anthropic | null = null;

export function deepScanAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export class DeepScanError extends Error {}

export async function runDeepScan(sentences: Sentence[]): Promise<DeepScanOutput> {
  client ??= new Anthropic();

  const numbered = sentences.map((s) => `[${s.index}] ${s.text}`).join("\n");

  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    // Classification task: low effort keeps latency and cost down.
    output_config: { effort: "low", format: zodOutputFormat(DeepScanSchema) },
    // If a safety classifier declines, let the API retry on its recommended fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `<document>\n${numbered}\n</document>\n\nScore every sentence from [0] to [${sentences.length - 1}].`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new DeepScanError("Deep Scan declined to analyse this text.");
  }
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new DeepScanError("Deep Scan returned an incomplete result.");
  }
  return response.parsed_output;
}
