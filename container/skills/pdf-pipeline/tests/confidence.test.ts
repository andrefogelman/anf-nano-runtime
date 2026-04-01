import { describe, it, expect } from "vitest";
import { computePageConfidence, flagLowConfidenceItems } from "../src/confidence.js";
import type { Ambiente, ReviewItem } from "../src/types.js";

describe("computePageConfidence", () => {
  it("returns average of ambiente confidences", () => {
    const ambientes: Ambiente[] = [
      {
        nome: "Sala",
        area_m2: 18.5,
        perimetro_m: 17.4,
        pe_direito_m: 2.8,
        acabamentos: { piso: "x", parede: "x", forro: "x" },
        aberturas: [],
        confidence: 0.9,
      },
      {
        nome: "Cozinha",
        area_m2: 12.0,
        perimetro_m: 14.0,
        pe_direito_m: 2.8,
        acabamentos: { piso: "x", parede: "x", forro: "x" },
        aberturas: [],
        confidence: 0.8,
      },
    ];
    const score = computePageConfidence(ambientes);
    expect(score).toBeCloseTo(0.85, 2);
  });

  it("returns 0 for empty ambientes", () => {
    expect(computePageConfidence([])).toBe(0);
  });
});

describe("flagLowConfidenceItems", () => {
  it("flags ambientes below threshold", () => {
    const ambientes: Ambiente[] = [
      {
        nome: "Sala",
        area_m2: 18.5,
        perimetro_m: 17.4,
        pe_direito_m: 2.8,
        acabamentos: { piso: "x", parede: "x", forro: "x" },
        aberturas: [],
        confidence: 0.92,
      },
      {
        nome: "Deposito",
        area_m2: 3.0,
        perimetro_m: 7.0,
        pe_direito_m: 2.8,
        acabamentos: { piso: "x", parede: "x", forro: "x" },
        aberturas: [],
        confidence: 0.55,
      },
    ];
    const existing: ReviewItem[] = [];
    const flagged = flagLowConfidenceItems(ambientes, existing);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].ambiente).toBe("Deposito");
    expect(flagged[0].confidence).toBe(0.55);
  });

  it("does not duplicate existing review items", () => {
    const ambientes: Ambiente[] = [
      {
        nome: "Deposito",
        area_m2: 3.0,
        perimetro_m: 7.0,
        pe_direito_m: 2.8,
        acabamentos: { piso: "x", parede: "x", forro: "x" },
        aberturas: [],
        confidence: 0.55,
      },
    ];
    const existing: ReviewItem[] = [
      { ambiente: "Deposito", campo: "area_m2", motivo: "Cota ilegivel", confidence: 0.55 },
    ];
    const flagged = flagLowConfidenceItems(ambientes, existing);
    expect(flagged).toHaveLength(0);
  });
});
