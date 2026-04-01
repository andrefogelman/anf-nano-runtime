// container/skills/pdf-pipeline/src/renderer.ts
import type { PDFPageProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import sharp from "sharp";
import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { RenderedPage } from "./types.js";

const execAsync = promisify(execFile);
const RENDER_SCALE = 2.0; // 2x for good OCR/Vision quality (typically ~150-200 DPI)

/**
 * Render a single PDF page to a PNG image using pdftoppm.
 * This is called from extractAllPages for OCR fallback on individual pages.
 * Note: requires the PDF file path — uses a workaround via the page viewport for dimensions.
 */
export async function renderPageToImage(
  page: PDFPageProxy,
  pageNumber: number,
  workDir: string
): Promise<RenderedPage> {
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const width = Math.floor(viewport.width);
  const height = Math.floor(viewport.height);

  const imagePath = join(workDir, `page-${pageNumber}.png`);

  // The actual rendering is done by renderPdfPages() which uses pdftoppm.
  // This function returns the expected path — the caller should ensure
  // renderPdfPages was called first, or use this as a placeholder.
  return {
    page_number: pageNumber,
    image_path: imagePath,
    width,
    height,
  };
}

/**
 * Render all pages (or specific pages) of a PDF to PNG images using pdftoppm.
 * This is the production renderer — requires poppler-utils in the container.
 */
export async function renderPdfPages(
  pdfPath: string,
  workDir: string,
  pages?: number[]
): Promise<RenderedPage[]> {
  const results: RenderedPage[] = [];

  if (pages && pages.length > 0) {
    // Render specific pages
    for (const pageNum of pages) {
      const outputPrefix = join(workDir, `page`);
      await execAsync("pdftoppm", [
        "-f", String(pageNum),
        "-l", String(pageNum),
        "-png",
        "-r", "200",
        pdfPath,
        outputPrefix,
      ]);

      // pdftoppm outputs: page-01.png, page-02.png, etc. (zero-padded)
      const imagePath = join(workDir, `page-${String(pageNum).padStart(2, "0")}.png`);

      // Get dimensions via sharp
      const metadata = await sharp(imagePath).metadata();
      results.push({
        page_number: pageNum,
        image_path: imagePath,
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
      });
    }
  } else {
    // Render all pages
    const outputPrefix = join(workDir, `page`);
    await execAsync("pdftoppm", ["-png", "-r", "200", pdfPath, outputPrefix]);

    // List generated files
    const files = await readdir(workDir);
    const pngFiles = files
      .filter((f) => f.startsWith("page-") && f.endsWith(".png"))
      .sort();

    for (const file of pngFiles) {
      const match = file.match(/page-(\d+)\.png$/);
      if (!match) continue;
      const pageNum = parseInt(match[1], 10);
      const imagePath = join(workDir, file);
      const metadata = await sharp(imagePath).metadata();
      results.push({
        page_number: pageNum,
        image_path: imagePath,
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
      });
    }
  }

  return results;
}
