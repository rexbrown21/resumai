import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

// pdf-parse is CJS-only; require() avoids the ESM default-export issue
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require("pdf-parse");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const name = file.name.toLowerCase();

    let text = "";

    if (name.endsWith(".pdf")) {
      const result = await pdfParse(buffer);
      text = result.text;
    } else if (name.endsWith(".docx") || name.endsWith(".doc")) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (name.endsWith(".txt") || name.endsWith(".rtf")) {
      text = buffer.toString("utf-8");
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF, DOCX, or TXT file." },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from this file. Try copying and pasting the text instead." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: text.trim() });
  } catch (error) {
    console.error("Parse resume error:", error);
    return NextResponse.json({ error: "Failed to parse resume file" }, { status: 500 });
  }
}
