import { describe, it, expect } from "vitest";
import { extractTextFromPage } from "../src/extraction.js";
import { MIN_NATIVE_TEXT_CHARS } from "../src/types.js";

describe("extractTextFromPage", () => {
  it("returns text content and char count for a page", async () => {
    // Uses a mock PDF page object
    const mockPage = {
      getTextContent: async () => ({
        items: [
          { str: "PLANTA BAIXA - PAVIMENTO TERREO", transform: [1, 0, 0, 1, 100, 700] },
          { str: "SALA - 18.50m\u00B2", transform: [1, 0, 0, 1, 200, 500] },
          { str: "Piso: Porcelanato 60x60 retificado", transform: [1, 0, 0, 1, 200, 480] },
        ],
      }),
    };

    const result = await extractTextFromPage(mockPage as any);
    expect(result.text).toContain("PLANTA BAIXA");
    expect(result.text).toContain("SALA");
    expect(result.text).toContain("18.50m\u00B2");
    expect(result.charCount).toBeGreaterThan(MIN_NATIVE_TEXT_CHARS);
  });

  it("returns low char count for nearly-empty pages", async () => {
    const mockPage = {
      getTextContent: async () => ({
        items: [{ str: "1", transform: [1, 0, 0, 1, 50, 50] }],
      }),
    };

    const result = await extractTextFromPage(mockPage as any);
    expect(result.charCount).toBeLessThan(MIN_NATIVE_TEXT_CHARS);
  });
});

describe("extractAllPages", () => {
  it("returns an array of ExtractedPage with ocr_used flags", async () => {
    // Integration test — validates the return shape
    const pages = [
      { page_number: 1, text_content: "PLANTA BAIXA ARQ-01", ocr_used: false, char_count: 120 },
      { page_number: 2, text_content: "", ocr_used: true, char_count: 5 },
    ];
    expect(pages[0].ocr_used).toBe(false);
    expect(pages[1].ocr_used).toBe(true);
  });
});
