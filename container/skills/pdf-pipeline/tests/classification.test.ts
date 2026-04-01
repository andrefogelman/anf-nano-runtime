import { describe, it, expect } from "vitest";
import { buildClassificationPrompt, parseClassificationResponse } from "../src/classification.js";
import type { ExtractedPage } from "../src/types.js";

describe("buildClassificationPrompt", () => {
  it("includes page text in the prompt", () => {
    const page: ExtractedPage = {
      page_number: 1,
      text_content: "PLANTA BAIXA - PAVIMENTO TERREO\nARQ-01\nESC: 1:50\nSALA COZINHA BANHEIRO",
      ocr_used: false,
      char_count: 60,
    };
    const prompt = buildClassificationPrompt(page);
    expect(prompt).toContain("PLANTA BAIXA");
    expect(prompt).toContain("ARQ-01");
  });
});

describe("parseClassificationResponse", () => {
  it("parses valid JSON classification", () => {
    const response = JSON.stringify({
      tipo: "arquitetonico-planta-baixa",
      prancha: "ARQ-01",
      pavimento: "terreo",
      confidence: 0.95,
    });
    const result = parseClassificationResponse(response);
    expect(result.tipo).toBe("arquitetonico-planta-baixa");
    expect(result.prancha).toBe("ARQ-01");
    expect(result.pavimento).toBe("terreo");
    expect(result.confidence).toBe(0.95);
  });

  it("defaults to 'outro' for unparseable response", () => {
    const result = parseClassificationResponse("some random text");
    expect(result.tipo).toBe("outro");
    expect(result.confidence).toBeLessThan(0.5);
  });

  it("extracts JSON from markdown code blocks", () => {
    const response = '```json\n{"tipo":"estrutural-forma","prancha":"EST-03","pavimento":"terreo","confidence":0.88}\n```';
    const result = parseClassificationResponse(response);
    expect(result.tipo).toBe("estrutural-forma");
  });
});
