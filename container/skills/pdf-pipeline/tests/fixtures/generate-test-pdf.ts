// Generates a minimal test PDF with text content for testing extraction
// Run: npx tsx tests/fixtures/generate-test-pdf.ts

import { writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Generate a minimal valid PDF with text content.
 * This is a raw PDF — no external deps needed.
 */
function generateTestPdf(text: string): Buffer {
  // Minimal PDF 1.4 with a single page containing text
  const content = `1 0 0 1 72 700 Tm\n/F1 12 Tf\n(${escapePdfString(text)}) Tj`;
  const streamBytes = Buffer.from(content, "ascii");

  const objects = [
    // 1: Catalog
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`,
    // 2: Pages
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`,
    // 3: Page
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj`,
    // 4: Content stream
    `4 0 obj\n<< /Length ${streamBytes.length} >>\nstream\nBT\n${content}\nET\nendstream\nendobj`,
    // 5: Font
    `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`,
  ];

  let body = "";
  const offsets: number[] = [];
  const header = "%PDF-1.4\n";

  let pos = header.length;
  for (const obj of objects) {
    offsets.push(pos);
    const line = obj + "\n";
    body += line;
    pos += Buffer.byteLength(line, "ascii");
  }

  const xrefStart = pos;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += `0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(header + body + xref + trailer, "ascii");
}

function escapePdfString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

async function main() {
  const cadPdf = generateTestPdf(
    "PLANTA BAIXA - PAVIMENTO TERREO  ARQ-01  ESC: 1:50  SALA 18.50m2  COZINHA 12.30m2  BANHEIRO 4.20m2"
  );
  await writeFile(join(__dirname, "cad-export.pdf"), cadPdf);

  // Empty PDF (simulates scanned — no text layer)
  const scannedPdf = generateTestPdf("");
  await writeFile(join(__dirname, "scanned.pdf"), scannedPdf);

  console.log("Test fixtures generated.");
}

main().catch(console.error);
