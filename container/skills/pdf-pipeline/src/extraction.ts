// container/skills/pdf-pipeline/src/extraction.ts
import { getDocument, type PDFDocumentProxy, type PDFPageProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { MIN_NATIVE_TEXT_CHARS, type ExtractedPage } from "./types.js";
import { runOcr } from "./ocr.js";
import { renderPageToImage } from "./renderer.js";

interface TextExtractionResult {
  text: string;
  charCount: number;
}

/**
 * Extract native text content from a single PDF page.
 * Returns concatenated text items with newlines between vertical gaps.
 */
export async function extractTextFromPage(page: PDFPageProxy): Promise<TextExtractionResult> {
  const content = await page.getTextContent();
  const items = content.items.filter(
    (item): item is typeof item & { str: string } => "str" in item
  );

  if (items.length === 0) {
    return { text: "", charCount: 0 };
  }

  // Sort items top-to-bottom, left-to-right using transform[5] (y) and transform[4] (x)
  items.sort((a, b) => {
    const ay = (a as any).transform?.[5] ?? 0;
    const by = (b as any).transform?.[5] ?? 0;
    const yDiff = by - ay; // PDF y-axis is bottom-up, so reverse
    if (Math.abs(yDiff) > 5) return yDiff;
    const ax = (a as any).transform?.[4] ?? 0;
    const bx = (b as any).transform?.[4] ?? 0;
    return ax - bx;
  });

  let prevY: number | null = null;
  const parts: string[] = [];

  for (const item of items) {
    const y = (item as any).transform?.[5] ?? 0;
    if (prevY !== null && Math.abs(prevY - y) > 5) {
      parts.push("\n");
    }
    parts.push(item.str);
    parts.push(" ");
    prevY = y;
  }

  const text = parts.join("").trim();
  return { text, charCount: text.replace(/\s/g, "").length };
}

/**
 * Extract text from all pages of a PDF file.
 * Falls back to OCR when native text is insufficient (<50 non-whitespace chars).
 */
export async function extractAllPages(
  pdfPath: string,
  workDir: string
): Promise<ExtractedPage[]> {
  const doc: PDFDocumentProxy = await getDocument({
    url: pdfPath,
    useSystemFonts: true,
  }).promise;

  const results: ExtractedPage[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const { text, charCount } = await extractTextFromPage(page);

    let finalText = text;
    let ocrUsed = false;

    if (charCount < MIN_NATIVE_TEXT_CHARS) {
      // Render page to image for OCR
      const rendered = await renderPageToImage(page, i, workDir);
      const ocrText = await runOcr(rendered.image_path);
      if (ocrText.replace(/\s/g, "").length > charCount) {
        finalText = ocrText;
        ocrUsed = true;
      }
    }

    results.push({
      page_number: i,
      text_content: finalText,
      ocr_used: ocrUsed,
      char_count: finalText.replace(/\s/g, "").length,
    });

    page.cleanup();
  }

  doc.destroy();
  return results;
}
