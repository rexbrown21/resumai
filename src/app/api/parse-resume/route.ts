import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    if (!name.endsWith(".docx") && !name.endsWith(".doc")) {
      return NextResponse.json({ error: "Only DOCX files are handled server-side" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();

    if (!text) {
      return NextResponse.json(
        { error: "Could not extract text from this file. Try copying and pasting the text instead." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Parse resume error:", error);
    return NextResponse.json({ error: "Failed to parse DOCX file" }, { status: 500 });
  }
}
