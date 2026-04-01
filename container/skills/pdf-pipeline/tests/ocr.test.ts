import { describe, it, expect } from "vitest";
import { parseOcrOutput } from "../src/ocr.js";

describe("parseOcrOutput", () => {
  it("parses PaddleOCR JSON output into text", () => {
    const ocrJson = JSON.stringify([
      [
        [[100, 200], [300, 200], [300, 230], [100, 230]],
        ["PLANTA BAIXA - PAVIMENTO TERREO", 0.95],
      ],
      [
        [[100, 300], [400, 300], [400, 330], [100, 330]],
        ["Sala - 18.50m\u00B2 - Pe-dir. 2.80m", 0.88],
      ],
      [
        [[100, 400], [350, 400], [350, 430], [100, 430]],
        ["Piso: Porcelanato 60x60 ret.", 0.91],
      ],
    ]);

    const text = parseOcrOutput(ocrJson);
    expect(text).toContain("PLANTA BAIXA");
    expect(text).toContain("Sala");
    expect(text).toContain("18.50m\u00B2");
    expect(text).toContain("Porcelanato");
  });

  it("handles empty OCR result", () => {
    const text = parseOcrOutput("[]");
    expect(text).toBe("");
  });

  it("handles malformed JSON gracefully", () => {
    const text = parseOcrOutput("not json");
    expect(text).toBe("");
  });
});
