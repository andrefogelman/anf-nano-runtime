import { describe, it, expect } from "vitest";
import { computePageConfidence, flagLowConfidenceItems } from "../src/confidence.js";
import type { Ambiente, ReviewItem } from "../src/types.js";

describe("computePageConfidence", () => {
  it("returns 0 for empty ambientes", () => {
    expect(computePageConfidence([])).toBe(0);
  });

  it("returns the minimum confidence, not average", () => {
    const ambientes: Ambiente[] = [
      {
        nome: "Sala",
        area_m2: 20,
        perimetro_m: 18,
        pe_direito_m: 2.8,
        acabamentos: { piso: "a", parede: "b", forro: "c" },
        aberturas: [],
        confidence: 0.95,
      },
      {
        nome: "Cozinha",
        area_m2: 10,
        perimetro_m: 13,
        pe_direito_m: 2.8,
        acabamentos: { piso: "a", parede: "b", forro: "c" },
        aberturas: [],
        confidence: 0.2,
      },
      {
        nome: "Quarto",
        area_m2: 12,
        perimetro_m: 14,
        pe_direito_m: 2.8,
        acabamentos: { piso: "a", parede: "b", forro: "c" },
        aberturas: [],
        confidence: 0.9,
      },
    ];
    // With average: (0.95 + 0.20 + 0.90) / 3 = 0.683
    // With minimum: 0.20
    expect(computePageConfidence(ambientes)).toBe(0.2);
  });

  it("returns single ambiente confidence", () => {
    const ambientes: Ambiente[] = [
      {
        nome: "Sala",
        area_m2: 20,
        perimetro_m: 18,
        pe_direito_m: 2.8,
        acabamentos: { piso: "a", parede: "b", forro: "c" },
        aberturas: [],
        confidence: 0.85,
      },
    ];
    expect(computePageConfidence(ambientes)).toBe(0.85);
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
