import { describe, it, expect } from "vitest";
import {
  DxfLayerSchema,
  DxfEntitySchema,
  DxfBlockSchema,
  DxfDimensionSchema,
  DxfTextSchema,
  ExtractedDxfDataSchema,
  BlockMappingSchema,
  LayerMappingSchema,
  DwgPageOutputSchema,
  ConversionResultSchema,
} from "../src/types.js";

describe("DxfLayerSchema", () => {
  it("validates a correct layer", () => {
    const result = DxfLayerSchema.safeParse({
      name: "ARQ-PAREDE",
      color: 7,
      is_on: true,
      is_frozen: false,
      entity_counts: { LINE: 42, LWPOLYLINE: 15 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = DxfLayerSchema.safeParse({
      color: 7,
      is_on: true,
      is_frozen: false,
      entity_counts: {},
    });
    expect(result.success).toBe(false);
  });
});

describe("DxfEntitySchema", () => {
  it("validates a LINE entity", () => {
    const result = DxfEntitySchema.safeParse({
      type: "LINE",
      layer: "ARQ-PAREDE",
      start: [0.0, 0.0],
      end: [5000.0, 0.0],
      length: 5000.0,
    });
    expect(result.success).toBe(true);
  });

  it("validates a closed LWPOLYLINE", () => {
    const result = DxfEntitySchema.safeParse({
      type: "LWPOLYLINE",
      layer: "ARQ-AMBIENTE",
      vertices: [[0, 0], [5000, 0], [5000, 3700], [0, 3700]],
      is_closed: true,
      length: 17400.0,
      area: 18500000.0,
    });
    expect(result.success).toBe(true);
  });

  it("validates a CIRCLE entity", () => {
    const result = DxfEntitySchema.safeParse({
      type: "CIRCLE",
      layer: "HID-TUB",
      center: [2500.0, 1850.0],
      radius: 25.0,
    });
    expect(result.success).toBe(true);
  });
});

describe("DxfBlockSchema", () => {
  it("validates a block insertion", () => {
    const result = DxfBlockSchema.safeParse({
      name: "TOMADA_2P",
      position: [1200.0, 800.0],
      rotation: 0,
      scale_x: 1,
      scale_y: 1,
      layer: "ELE-TOMADA",
      count: 15,
    });
    expect(result.success).toBe(true);
  });
});

describe("DxfDimensionSchema", () => {
  it("validates a linear dimension", () => {
    const result = DxfDimensionSchema.safeParse({
      type: "linear",
      actual_measurement: 5.0,
      position: [2500.0, -200.0],
      layer: "COT-COTAS",
    });
    expect(result.success).toBe(true);
  });
});

describe("DxfTextSchema", () => {
  it("validates a TEXT entity", () => {
    const result = DxfTextSchema.safeParse({
      type: "TEXT",
      content: "Sala",
      position: [2500.0, 1850.0],
      height: 200.0,
      rotation: 0,
      layer: "ARQ-TEXTO",
    });
    expect(result.success).toBe(true);
  });
});

describe("ExtractedDxfDataSchema", () => {
  it("validates a complete extraction", () => {
    const result = ExtractedDxfDataSchema.safeParse({
      filename: "test.dxf",
      units: "mm",
      layers: [
        { name: "0", color: 7, is_on: true, is_frozen: false, entity_counts: {} },
      ],
      entities: [],
      blocks: [],
      dimensions: [],
      texts: [],
      stats: {
        total_layers: 1,
        total_entities: 0,
        total_blocks: 0,
        total_dimensions: 0,
        total_texts: 0,
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("BlockMappingSchema", () => {
  it("validates a block mapping", () => {
    const result = BlockMappingSchema.safeParse({
      org_id: "550e8400-e29b-41d4-a716-446655440000",
      block_name: "TOMADA_2P",
      componente: "tomada",
      disciplina: "ele",
      unidade: "pt",
      confirmed: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("LayerMappingSchema", () => {
  it("validates a layer mapping", () => {
    const result = LayerMappingSchema.safeParse({
      org_id: "550e8400-e29b-41d4-a716-446655440000",
      layer_name: "ARQ-PAREDE",
      disciplina: "arq",
      confirmed: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("DwgPageOutputSchema", () => {
  it("validates a complete DWG page output", () => {
    const result = DwgPageOutputSchema.safeParse({
      prancha: "ARQ-01",
      tipo: "arquitetonico-planta-baixa",
      source: "dwg",
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
            { tipo: "porta", dim: "0.80x2.10", qtd: 1, codigo: "P1" },
          ],
          confidence: 0.97,
        },
      ],
      blocos: [
        { nome: "TOMADA_2P", contagem: 15, disciplina: "ele", confidence: 0.95, needs_review: false },
        { nome: "Block1", contagem: 8, disciplina: null, confidence: 0, needs_review: true },
      ],
      tubulacoes: [
        { diametro_mm: 50, material: "PVC", comprimento_m: 23.4, layer: "HID-TUB-AF" },
      ],
      needs_review: ["Block1"],
    });
    expect(result.success).toBe(true);
  });
});

describe("ConversionResultSchema", () => {
  it("validates success", () => {
    const result = ConversionResultSchema.safeParse({
      success: true,
      dxfPath: "/tmp/output.dxf",
    });
    expect(result.success).toBe(true);
  });

  it("validates failure", () => {
    const result = ConversionResultSchema.safeParse({
      success: false,
      error: "needs_conversion",
    });
    expect(result.success).toBe(true);
  });
});
