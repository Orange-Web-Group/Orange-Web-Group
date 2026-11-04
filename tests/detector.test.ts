import { describe, expect, it } from "vitest";
import { detect, verdictFrom } from "@/lib/detector";
import { splitSentences } from "@/lib/detector/text";
import { decodeSession, encodeSession } from "@/lib/usage";

const AI_TEXT = `In today's fast-paced digital landscape, effective communication plays a crucial role in fostering meaningful connections. Furthermore, it is important to note that technology has fundamentally transformed the way we interact with one another. By leveraging innovative tools, individuals and organizations can navigate the complexities of modern life with greater ease. Additionally, these advancements offer a myriad of opportunities for growth, collaboration, and learning. Ultimately, embracing change allows us to unlock our full potential and build a more connected future.`;

const HUMAN_TEXT = `I didn't expect the bus to be late again, but of course it was. Twenty minutes in the rain, no umbrella, and my phone at 4%. When it finally showed up the driver just shrugged. Honestly? I laughed. My grandmother used to say the 42 ran on "island time," and she wasn't wrong. Anyway, I got to work soaked, spilled half my coffee on the keyboard, and still made the 9:15 standup. Barely.`;

describe("splitSentences", () => {
  it("splits on sentence boundaries and keeps paragraphs", () => {
    const s = splitSentences("First one here. Second one! Third?\n\nNew paragraph starts.");
    expect(s.map((x) => x.text)).toEqual(["First one here.", "Second one!", "Third?", "New paragraph starts."]);
    expect(s[3].paragraph).toBe(1);
  });

  it("does not split mid-abbreviation followed by lowercase", () => {
    expect(splitSentences("Bring fruit, e.g. apples and pears. Then leave.")).toHaveLength(2);
  });
});

describe("standard engine", () => {
  it("scores obvious AI text as AI", async () => {
    const r = await detect(AI_TEXT, { deep: false });
    expect(r.verdict).toBe("ai");
    expect(r.aiProbability).toBeGreaterThan(0.75);
    expect(r.engine).toBe("standard");
  });

  it("scores casual human text as human", async () => {
    const r = await detect(HUMAN_TEXT, { deep: false });
    expect(r.verdict).toBe("human");
    expect(r.aiProbability).toBeLessThan(0.3);
  });

  it("flags a pasted AI paragraph inside human writing as mixed or AI-leaning", async () => {
    const r = await detect(`${HUMAN_TEXT}\n\n${AI_TEXT}`, { deep: false });
    const human = await detect(HUMAN_TEXT, { deep: false });
    expect(r.aiProbability).toBeGreaterThan(human.aiProbability);
    const aiSentences = r.sentences.filter((s) => s.aiProbability >= 0.65).length;
    expect(aiSentences).toBeGreaterThanOrEqual(3);
  });

  it("breakdown sums to 1", async () => {
    const r = await detect(AI_TEXT, { deep: false });
    const sum = r.breakdown.human + r.breakdown.mixed + r.breakdown.ai;
    expect(sum).toBeCloseTo(1, 2);
  });

  it("notes when deep scan is requested but not configured", async () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const r = await detect(AI_TEXT, { deep: true });
    expect(r.engine).toBe("standard");
    expect(r.engineNote).toMatch(/not configured/);
    if (prev) process.env.ANTHROPIC_API_KEY = prev;
  });
});

describe("verdictFrom", () => {
  it("returns mixed when strong human and AI sentences coexist", () => {
    expect(verdictFrom([0.9, 0.9, 0.9, 0.1, 0.1, 0.1], 0.5).verdict).toBe("mixed");
  });
});

describe("session cookie", () => {
  it("round-trips and rejects tampering", () => {
    const raw = encodeSession({ plan: "pro", month: "2026-11", wordsUsed: 123 });
    expect(decodeSession(raw)?.plan).toBe("pro");
    const [payload, sig] = raw.split(".");
    const forged = Buffer.from(JSON.stringify({ plan: "team", month: "2026-11", wordsUsed: 0 })).toString("base64url");
    expect(decodeSession(`${forged}.${sig}`)).toBeNull();
    expect(decodeSession(`${payload}.bad`)).toBeNull();
  });
});
