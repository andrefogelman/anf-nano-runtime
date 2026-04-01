import { describe, it, expect } from "vitest";
import { PageOutputSchema, type PageOutput } from "../src/types.js";

describe("PageOutput schema", () => {
  it("validates a correct page output", () => {
    const valid: PageOutput = {
      prancha: "ARQ-01",
      tipo: "arquitetonico-planta-baixa",
      pavimento: "terreo",
      page_number: 1,
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
    };
    const result = PageOutputSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const invalid = { prancha: "ARQ-01" };
    const result = PageOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects invalid tipo enum value", () => {
    const invalid = {
      prancha: "ARQ-01",
      tipo: "invalid-type",
      pavimento: "terreo",
      page_number: 1,
      ambientes: [],
      needs_review: [],
    };
    const result = PageOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("flags items below 70% confidence in needs_review", () => {
    const output: PageOutput = {
      prancha: "ARQ-01",
      tipo: "arquitetonico-planta-baixa",
      pavimento: "terreo",
      page_number: 1,
      ambientes: [
        {
          nome: "Sala",
          area_m2: 18.5,
          perimetro_m: 17.4,
          pe_direito_m: 2.8,
          acabamentos: { piso: "porcelanato", parede: "pintura", forro: "gesso" },
          aberturas: [],
          confidence: 0.55,
        },
      ],
      needs_review: [
        {
          ambiente: "Sala",
          campo: "area_m2",
          motivo: "Cota ilegivel, area estimada por escala grafica",
          confidence: 0.55,
        },
      ],
    };
    expect(output.needs_review.length).toBeGreaterThan(0);
    expect(output.needs_review[0].confidence).toBeLessThan(0.7);
  });
});
