// container/skills/pdf-pipeline/src/ocr.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const execAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const PYTHON_SCRIPT = join(__dirname, "..", "python", "ocr_worker.py");

/**
 * Parse PaddleOCR JSON output into a single text string.
 * PaddleOCR returns: [[bbox, [text, confidence]], ...]
 * We sort by Y coordinate (top-to-bottom) then X (left-to-right).
 */
export function parseOcrOutput(jsonStr: string): string {
  try {
    const results = JSON.parse(jsonStr);
    if (!Array.isArray(results) || results.length === 0) return "";

    // Each item: [bbox_points, [text, confidence]]
    // bbox_points: [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
    const items = results.map((item: any) => {
      const bbox = item[0];
      const text = item[1][0];
      const confidence = item[1][1];
      // Use top-left Y for sorting
      const y = bbox[0][1];
      const x = bbox[0][0];
      return { text, confidence, x, y };
    });

    // Sort top-to-bottom, then left-to-right
    items.sort((a: any, b: any) => {
      const yDiff = a.y - b.y;
      if (Math.abs(yDiff) > 10) return yDiff;
      return a.x - b.x;
    });

    // Group into lines (items within 10px Y of each other)
    const lines: string[][] = [];
    let currentLine: string[] = [];
    let currentY = items[0]?.y ?? 0;

    for (const item of items) {
      if (Math.abs(item.y - currentY) > 10) {
        if (currentLine.length > 0) lines.push(currentLine);
        currentLine = [];
        currentY = item.y;
      }
      currentLine.push(item.text);
    }
    if (currentLine.length > 0) lines.push(currentLine);

    return lines.map((line) => line.join(" ")).join("\n");
  } catch {
    return "";
  }
}

/**
 * Run PaddleOCR on an image file and return extracted text.
 * Calls Python subprocess with the ocr_worker.py script.
 */
export async function runOcr(imagePath: string): Promise<string> {
  try {
    const { stdout } = await execAsync("python3", [PYTHON_SCRIPT, imagePath], {
      timeout: 60_000, // 60s timeout per page
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for OCR output
    });
    return parseOcrOutput(stdout.trim());
  } catch (error) {
    console.error(`OCR failed for ${imagePath}:`, error);
    return "";
  }
}
