// Client-side resume text extraction.
//
// Uses the same proven approach as the tailor page: pdfjs 2.16.105 loaded from
// CDN with a *same-origin blob worker* (avoids cross-origin worker blocks), and
// mammoth from CDN for DOCX. Throws on unsupported types or empty extraction so
// callers can surface a friendly error.

const loadCdnScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });

async function extractPdfText(file: File): Promise<string> {
  const BASE = "https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/build";

  await loadCdnScript(`${BASE}/pdf.min.js`);

  const pdfjs = (window as any).pdfjsLib;
  if (!pdfjs) throw new Error("PDF library failed to load. Please try again.");

  // Fetch worker as a blob so it runs same-origin — avoids cross-origin blocks.
  const workerBlob = await fetch(`${BASE}/pdf.worker.min.js`).then((r) => r.blob());
  const workerUrl = URL.createObjectURL(workerBlob);
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item: any) => item.str || "").join(" "));
    }
    return pages.join("\n");
  } finally {
    URL.revokeObjectURL(workerUrl);
  }
}

async function extractDocxText(file: File): Promise<string> {
  await loadCdnScript("https://cdn.jsdelivr.net/npm/mammoth@1/mammoth.browser.min.js");
  const arrayBuffer = await file.arrayBuffer();
  const result = await (window as any).mammoth.extractRawText({ arrayBuffer });
  return (result?.value as string) || "";
}

/**
 * Extracts plain text from a PDF or DOCX resume file.
 * @throws if the file type is unsupported or no text can be extracted.
 */
export async function extractResumeText(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  let text = "";
  if (name.endsWith(".pdf")) {
    text = await extractPdfText(file);
  } else if (name.endsWith(".docx")) {
    text = await extractDocxText(file);
  } else {
    throw new Error("Unsupported file type. Please upload a PDF or DOCX file.");
  }

  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("No text could be extracted from this file.");
  }
  return trimmed;
}
