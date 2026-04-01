import { describe, it, expect } from "vitest";
import {
  buildInterpretationPrompt,
  parseInterpretationResponse,
} from "../src/interpretation.js";
import type { ClassifiedPage } from "../src/types.js";

describe("buildInterpretationPrompt", () => {
  it("includes classification context in the prompt", () => {
    const page: ClassifiedPage = {
      page_number: 1,
      text_content: "SALA 18.50m\u00B2 COZINHA 12.30m\u00B2",
      ocr_used: false,
      char_count: 30,
      tipo: "arquitetonico-planta-baixa",
      prancha: "ARQ-01",
      pavimento: "terreo",
      classification_confidence: 0.95,
    };
    const prompt = buildInterpretationPrompt(page);
    expect(prompt).toContain("arquitetonico-planta-baixa");
    expect(prompt).toContain("ARQ-01");
    expect(prompt).toContain("terreo");
    expect(prompt).toContain("SALA 18.50m\u00B2");
  });
});

describe("parseInterpretationResponse", () => {
  it("parses valid interpretation JSON", () => {
    const response = JSON.stringify({
      ambientes: [
        {
          nome: "Sala",
          area_m2: 18.5,
          perimetro_m: 17.4,
          pe_direito_m: 2.8,
          acabamentos: {
            piso: "porcelanato 60x60 retificado",
            parede: "pintura latex branco",
            forro: "gesso liso",
          },
          aberturas: [
            { tipo: "porta", dim: "0.80x2.10", qtd: 1 },
            { tipo: "janela", dim: "1.50x1.20", qtd: 2 },
          ],
          confidence: 0.92,
        },
      ],
      needs_review: [],
    });
    const result = parseInterpretationResponse(response);
    expect(result.ambientes).toHaveLength(1);
    expect(result.ambientes[0].nome).toBe("Sala");
    expect(result.ambientes[0].area_m2).toBe(18.5);
    expect(result.needs_review).toHaveLength(0);
  });

  it("returns empty result for unparseable response", () => {
    const result = parseInterpretationResponse("garbage");
    expect(result.ambientes).toHaveLength(0);
    expect(result.needs_review).toHaveLength(0);
  });

  it("extracts JSON from markdown code blocks", () => {
    const response = '```json\n{"ambientes":[],"needs_review":[]}\n```';
    const result = parseInterpretationResponse(response);
    expect(result.ambientes).toHaveLength(0);
  });
});
