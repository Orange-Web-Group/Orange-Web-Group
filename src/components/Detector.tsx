"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { DetectionResult, SentenceResult } from "@/lib/detector";
import type { UsageSummary } from "@/lib/usage";

const SAMPLE_AI = `In today's fast-paced digital landscape, effective communication plays a crucial role in fostering meaningful connections. Furthermore, it is important to note that technology has fundamentally transformed the way we interact with one another. By leveraging innovative tools, individuals and organizations can navigate the complexities of modern life with greater ease. Additionally, these advancements offer a myriad of opportunities for growth, collaboration, and learning. Ultimately, embracing change allows us to unlock our full potential and build a more connected future.`;

const SAMPLE_HUMAN = `I didn't expect the bus to be late again, but of course it was. Twenty minutes in the rain, no umbrella, and my phone at 4%. When it finally showed up the driver just shrugged. Honestly? I laughed. My grandmother used to say the 42 ran on "island time," and she wasn't wrong. Anyway, I got to work soaked, spilled half my coffee on the keyboard, and still made the 9:15 standup. Barely.`;

interface HistoryItem {
  id: string;
  at: number;
  snippet: string;
  verdict: DetectionResult["verdict"];
  aiProbability: number;
  text: string;
}

const HISTORY_KEY = "truedraft.history.v1";

function loadHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 20)));
  } catch {
    /* storage unavailable: history is a convenience only */
  }
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const VERDICT_TEXT = {
  ai: "Likely AI-generated",
  mixed: "Mixed: human and AI",
  human: "Likely human-written",
} as const;

function sentenceClass(p: number) {
  if (p >= 0.75) return "sent ai-strong";
  if (p >= 0.55) return "sent ai-mild";
  return "sent human";
}

function wordCount(text: string) {
  return (text.match(/[A-Za-z0-9À-ɏ']+/g) ?? []).length;
}

export default function Detector() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<{ msg: string; upgrade?: boolean } | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [deepConfigured, setDeepConfigured] = useState(false);
  const [deep, setDeep] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => {
        setUsage(d.usage);
        setDeepConfigured(d.deepScanConfigured);
      })
      .catch(() => {});
  }, []);

  const words = useMemo(() => wordCount(text), [text]);
  const overLimit = usage ? words > usage.wordsPerScan : false;

  async function scan() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, deep: usage?.deepScan ? deep : false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ msg: data.error ?? "Something went wrong.", upgrade: data.upgrade });
        return;
      }
      const r: DetectionResult = data.result;
      setResult(r);
      setUsage(data.usage);
      const item: HistoryItem = {
        id: crypto.randomUUID(),
        at: Date.now(),
        snippet: text.slice(0, 80),
        verdict: r.verdict,
        aiProbability: r.aiProbability,
        text,
      };
      const next = [item, ...history].slice(0, 20);
      setHistory(next);
      saveHistory(next);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    } catch {
      setError({ msg: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/extract", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) setError({ msg: data.error, upgrade: data.upgrade });
      else {
        setText(data.text);
        setResult(null);
      }
    } catch {
      setError({ msg: "Upload failed. Please try again." });
    } finally {
      setUploading(false);
    }
  }

  function downloadReport() {
    if (!result) return;
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
    const paras = groupParagraphs(result.sentences)
      .map(
        (p) =>
          `<p>${p
            .map((s) => `<span style="background:${s.aiProbability >= 0.75 ? "#ffd2b8" : s.aiProbability >= 0.55 ? "#ffe7d9" : "transparent"}">${esc(s.text)}</span>`)
            .join(" ")}</p>`,
      )
      .join("");
    const html = `<!doctype html><meta charset="utf-8"><title>TrueDraft report</title>
<body style="font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 16px;line-height:1.7;color:#1c1a17">
<h1 style="margin-bottom:4px">TrueDraft scan report</h1>
<p style="color:#6b665e">${new Date().toLocaleString()} · ${result.wordCount} words · ${result.engine === "deep" ? "Deep Scan" : "Standard scan"}</p>
<h2>${VERDICT_TEXT[result.verdict]}</h2>
<p>AI probability: <b>${pct(result.aiProbability)}</b> · Human ${pct(result.breakdown.human)} · Mixed ${pct(result.breakdown.mixed)} · AI ${pct(result.breakdown.ai)} · Confidence: ${result.confidence}</p>
<p>${esc(result.explanation)}</p><hr>${paras}
<hr><p style="color:#6b665e;font-size:13px">Highlighted sentences scored as likely AI-generated. AI detection is probabilistic and should not be the sole basis for academic or employment decisions.</p></body>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `truedraft-report-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const usedPct = usage ? Math.min(100, (usage.wordsUsed / usage.wordsPerMonth) * 100) : 0;

  return (
    <>
      <div className="detector">
        <section className="card editor" aria-label="Text to analyse">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste an essay, article, email or any text (at least 40 words) to check whether it was written by a person or by AI."
            aria-label="Text to scan"
          />
          <div className="editor-bar">
            <div className="left">
              <span className={`small ${overLimit ? "" : "muted"}`} style={overLimit ? { color: "var(--ai)" } : undefined}>
                {words.toLocaleString()}
                {usage ? ` / ${usage.wordsPerScan.toLocaleString()}` : ""} words
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => { setText(SAMPLE_AI); setResult(null); }}>
                AI sample
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setText(SAMPLE_HUMAN); setResult(null); }}>
                Human sample
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? "Reading…" : "Upload file"}
              </button>
              <input ref={fileRef} type="file" accept=".txt,.md,.docx,.pdf" hidden onChange={onFile} />
            </div>
            <button className="btn btn-primary" onClick={scan} disabled={loading || words < 40 || overLimit}>
              {loading ? <><span className="spinner" /> Scanning…</> : "Check text"}
            </button>
          </div>
          {usage && (
            <div className="editor-bar">
              <label className="toggle" title={usage.deepScan ? "" : "Deep Scan is included on Pro and Team"}>
                <input
                  type="checkbox"
                  checked={usage.deepScan && deep}
                  disabled={!usage.deepScan}
                  onChange={(e) => setDeep(e.target.checked)}
                />
                Deep Scan {!usage.deepScan && <Link href="/pricing" className="small" style={{ color: "var(--brand)" }}>(Pro)</Link>}
                {usage.deepScan && !deepConfigured && <span className="small muted">(not configured)</span>}
              </label>
              <div className="meter">
                {usage.planName} plan · {usage.wordsUsed.toLocaleString()} of {usage.wordsPerMonth.toLocaleString()} words this month
                <div className="meter-bar"><span style={{ width: `${usedPct}%` }} /></div>
              </div>
            </div>
          )}
          {error && (
            <div className="alert" role="alert">
              {error.msg} {error.upgrade && <Link href="/pricing">See plans →</Link>}
            </div>
          )}
        </section>

        <section className="card result" aria-live="polite" ref={resultRef}>
          {!result ? (
            <div className="result-empty">
              <p style={{ fontWeight: 600, color: "var(--text)" }}>Your results will appear here</p>
              <p className="small">You&apos;ll get a verdict, a probability breakdown, and every sentence highlighted by how likely it is to be AI-written.</p>
            </div>
          ) : (
            <ResultPanel result={result} onDownload={downloadReport} canDownload={Boolean(usage?.fileUpload)} />
          )}
          {history.length > 0 && (
            <div className="history">
              <div className="small muted" style={{ marginBottom: 6 }}>Recent scans (stored in this browser)</div>
              <ul>
                {history.slice(0, 5).map((h) => (
                  <li key={h.id}>
                    <button onClick={() => { setText(h.text); setResult(null); }}>
                      <span className="snippet">{h.snippet}</span>
                      <span style={{ color: `var(--${h.verdict === "ai" ? "ai" : h.verdict})`, flexShrink: 0 }}>{pct(h.aiProbability)} AI</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {result && <HighlightedText sentences={result.sentences} />}
      </div>
    </>
  );
}

function ResultPanel({ result, onDownload, canDownload }: { result: DetectionResult; onDownload: () => void; canDownload: boolean }) {
  const b = result.breakdown;
  return (
    <div>
      <div className="verdict-label">Verdict · {result.confidence} confidence</div>
      <div className={`verdict ${result.verdict}`}>{VERDICT_TEXT[result.verdict]}</div>
      <div className="gauge" role="img" aria-label={`Human ${pct(b.human)}, mixed ${pct(b.mixed)}, AI ${pct(b.ai)}`}>
        <span style={{ width: pct(b.human), background: "var(--human)" }} />
        <span style={{ width: pct(b.mixed), background: "var(--mixed)" }} />
        <span style={{ width: pct(b.ai), background: "var(--ai)" }} />
      </div>
      <div className="legend">
        <span><span className="dot" style={{ background: "var(--human)" }} />Human <b>{pct(b.human)}</b></span>
        <span><span className="dot" style={{ background: "var(--mixed)" }} />Mixed <b>{pct(b.mixed)}</b></span>
        <span><span className="dot" style={{ background: "var(--ai)" }} />AI <b>{pct(b.ai)}</b></span>
      </div>
      <p style={{ marginTop: 16 }}>{result.explanation}</p>
      {result.engineNote && <p className="small muted">{result.engineNote}</p>}
      <div className="stats-grid">
        <div className="stat"><div className="k">AI probability</div><div className="v">{pct(result.aiProbability)}</div></div>
        <div className="stat"><div className="k">Words</div><div className="v">{result.wordCount.toLocaleString()}</div></div>
        <div className="stat" title="Variation in sentence length. People vary more; models write evenly.">
          <div className="k">Burstiness</div><div className="v">{result.signals.burstiness.toFixed(2)}</div>
        </div>
        <div className="stat"><div className="k">Engine</div><div className="v">{result.engine === "deep" ? "Deep Scan" : "Standard"}</div></div>
      </div>
      {canDownload ? (
        <button className="btn btn-ghost btn-sm" onClick={onDownload}>Download report</button>
      ) : (
        <span className="small muted">Report downloads are included on <Link href="/pricing" style={{ color: "var(--brand)" }}>Starter and above</Link>.</span>
      )}
    </div>
  );
}

function groupParagraphs(sentences: SentenceResult[]): SentenceResult[][] {
  const out: SentenceResult[][] = [];
  for (const s of sentences) {
    (out[s.paragraph] ??= []).push(s);
  }
  return out.filter(Boolean);
}

function HighlightedText({ sentences }: { sentences: SentenceResult[] }) {
  const flagged = sentences.filter((s) => s.aiProbability >= 0.55).length;
  return (
    <section className="card highlighted" aria-label="Sentence highlights">
      <div className="editor-bar" style={{ marginBottom: 12 }}>
        <strong>Sentence breakdown</strong>
        <span className="small muted">
          {flagged} of {sentences.length} sentences flagged ·{" "}
          <span className="sent ai-strong">likely AI</span> <span className="sent ai-mild">possibly AI</span>
        </span>
      </div>
      {groupParagraphs(sentences).map((para, i) => (
        <p key={i}>
          {para.map((s) => (
            <span
              key={s.index}
              className={sentenceClass(s.aiProbability)}
              title={`${pct(s.aiProbability)} AI${s.markers.length ? ` · phrases: ${s.markers.join(", ")}` : ""}`}
            >
              {s.text}{" "}
            </span>
          ))}
        </p>
      ))}
    </section>
  );
}
