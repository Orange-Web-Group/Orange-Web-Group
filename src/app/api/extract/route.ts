import { NextResponse } from "next/server";
import { PLANS } from "@/lib/plans";
import { readSession } from "@/lib/usage";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await readSession();
  if (!PLANS[session.plan].fileUpload) {
    return NextResponse.json(
      { error: "File uploads are included on Starter and above.", upgrade: true },
      { status: 402 },
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Attach a file in the 'file' field." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Files must be 10 MB or smaller." }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());

  try {
    let text: string;
    if (name.endsWith(".txt") || name.endsWith(".md")) {
      text = buf.toString("utf8");
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      text = (await mammoth.extractRawText({ buffer: buf })).value;
    } else if (name.endsWith(".pdf")) {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      text = (await extractText(pdf, { mergePages: true })).text;
    } else {
      return NextResponse.json({ error: "Supported formats: .txt, .md, .docx, .pdf" }, { status: 400 });
    }
    text = text.replace(/\u0000/g, "").trim();
    if (!text) return NextResponse.json({ error: "No readable text found in that file." }, { status: 400 });
    return NextResponse.json({ text, filename: file.name });
  } catch (err) {
    console.error("extract failed", err);
    return NextResponse.json({ error: "Could not read that file." }, { status: 400 });
  }
}
