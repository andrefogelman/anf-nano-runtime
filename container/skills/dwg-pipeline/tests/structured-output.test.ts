import { describe, it, expect, vi } from "vitest";
import type { ExtractedDxfData, ClassifiedLayer, MappedBlock } from "../src/types.js";
import { computeQualityReport } from "../src/structured-output.js";

// Mock the extractor to avoid Python dependency in tests
vi.mock("../src/extractor.js", () => ({
  associateTextsToRooms: vi.fn().mockResolvedValue({}),
}));

describe("assembleOutput", () => {
  it("produces valid DwgPageOutput from extraction data", async () => {
    const { assembleOutput } = await import("../src/structured-output.js");
    const { DwgPageOutputSchema } = await import("../src/types.js");

    const data: ExtractedDxfData = {
      filename: "test.dxf",
      units: "mm",
      layers: [
        { name: "ARQ-PAREDE", color: 7, is_on: true, is_frozen: false, entity_counts: { LINE: 20 } },
        { name: "ELE-TOMADA", color: 3, is_on: true, is_frozen: false, entity_counts: { INSERT: 5 } },
        { name: "HID-TUB-AF", color: 1, is_on: true, is_frozen: false, entity_counts: { LINE: 10 } },
      ],
      entities: [
        {
          type: "LWPOLYLINE",
          layer: "ARQ-PAREDE",
          vertices: [[0, 0], [5000, 0], [5000, 3700], [0, 3700]],
          is_closed: true,
          length: 17400,
          area: 18500000,
        },
        {
          type: "LINE",
          layer: "HID-TUB-AF",
          start: [0, 0],
          end: [5000, 0],
          length: 5000,
        },
      ],
      blocks: [
        {
          name: "TOMADA_2P",
          position: [100, 200],
          rotation: 0,
          scale_x: 1,
          scale_y: 1,
          layer: "ELE-TOMADA",
          count: 15,
        },
      ],
      dimensions: [],
      texts: [
        { type: "TEXT", content: "Sala", position: [2500, 1850], height: 200, rotation: 0, layer: "ARQ-PAREDE" },
      ],
      hatches: [],
      stats: {
        total_layers: 3,
        total_entities: 2,
        total_blocks: 1,
        total_dimensions: 0,
        total_texts: 1,
        total_hatches: 0,
      },
    };

    const classifiedLayers: ClassifiedLayer[] = [
      { name: "ARQ-PAREDE", disciplina: "arq", confidence: 0.95, method: "regex" },
      { name: "ELE-TOMADA", disciplina: "ele", confidence: 0.95, method: "regex" },
      { name: "HID-TUB-AF", disciplina: "hid", confidence: 0.95, method: "regex" },
    ];

    const mappedBlocks: MappedBlock[] = [
      { name: "TOMADA_2P", componente: "tomada", disciplina: "ele", unidade: "pt", contagem: 15, confidence: 0.95, needs_review: false },
    ];

    const output = await assembleOutput(data, classifiedLayers, mappedBlocks);

    expect(output.source).toBe("dwg");
    expect(output.blocos).toHaveLength(1);
    expect(output.blocos[0].nome).toBe("TOMADA_2P");
    expect(output.blocos[0].contagem).toBe(15);

    // Validate against schema
    const validation = DwgPageOutputSchema.safeParse(output);
    expect(validation.success).toBe(true);
  });

  it("uses hatch area when available instead of polyline area", async () => {
    const { assembleOutput } = await import("../src/structured-output.js");

    const data: ExtractedDxfData = {
      filename: "test.dxf",
      units: "mm",
      layers: [
        { name: "ARQ-PAREDE", color: 7, is_on: true, is_frozen: false, entity_counts: { LWPOLYLINE: 1 } },
      ],
      entities: [
        {
          type: "LWPOLYLINE",
          layer: "ARQ-PAREDE",
          vertices: [[0, 0], [5000, 0], [5000, 4000], [0, 4000]] as [number, number][],
          is_closed: true,
          length: 18000,
          area: 20_000_000, // 20m² in mm²
        },
      ],
      blocks: [],
      dimensions: [],
      texts: [
        { type: "TEXT", content: "SALA", position: [2500, 2000] as [number, number], height: 200, rotation: 0, layer: "ARQ-PAREDE" },
      ],
      hatches: [
        {
          layer: "ARQ-PAREDE",
          pattern: "SOLID",
          area: 19_500_000, // 19.5m² in mm² (more precise from fill)
          vertices: [[100, 100], [4900, 100], [4900, 3900], [100, 3900]],
        },
      ],
      stats: {
        total_layers: 1,
        total_entities: 1,
        total_blocks: 0,
        total_dimensions: 0,
        total_texts: 1,
        total_hatches: 1,
      },
    };

    const classifiedLayers: ClassifiedLayer[] = [
      { name: "ARQ-PAREDE", disciplina: "arq", confidence: 0.95, method: "regex" },
    ];

    const result = await assembleOutput(data as any, classifiedLayers, []);

    expect(result.ambientes.length).toBeGreaterThanOrEqual(1);
    // Text association is mocked, so room may be named "Ambiente 1" instead of "SALA"
    const room = result.ambientes[0];
    expect(room).toBeDefined();
    // Should use hatch area (19.5m²) not polyline area (20m²)
    expect(room.area_m2).toBeCloseTo(19.5, 0);
  });

  it("flags unknown blocks in needs_review", async () => {
    const { assembleOutput } = await import("../src/structured-output.js");

    const data: ExtractedDxfData = {
      filename: "test.dxf",
      units: "mm",
      layers: [],
      entities: [],
      blocks: [],
      dimensions: [],
      texts: [],
      hatches: [],
      stats: { total_layers: 0, total_entities: 0, total_blocks: 0, total_dimensions: 0, total_texts: 0, total_hatches: 0 },
    };

    const classifiedLayers: ClassifiedLayer[] = [];
    const mappedBlocks: MappedBlock[] = [
      { name: "Block1", componente: "desconhecido", disciplina: "geral", unidade: "un", contagem: 8, confidence: 0, needs_review: true },
    ];

    const output = await assembleOutput(data, classifiedLayers, mappedBlocks);
    expect(output.needs_review).toContain("Block1");
  });
});

describe("computeQualityReport", () => {
  it("returns zero report for empty ambientes", () => {
    const report = computeQualityReport([]);
    expect(report.total_ambientes).toBe(0);
    expect(report.quality_score).toBe(0);
  });

  it("scores 1.0 when all ambientes are valid", () => {
    const ambientes = [
      { nome: "Sala", area_m2: 25, perimetro_m: 20, pe_direito_m: 2.8, acabamentos: { piso: "a", parede: "b", forro: "c" }, aberturas: [], confidence: 0.95 },
      { nome: "Quarto", area_m2: 12, perimetro_m: 14, pe_direito_m: 2.8, acabamentos: { piso: "a", parede: "b", forro: "c" }, aberturas: [], confidence: 0.90 },
    ];
    const report = computeQualityReport(ambientes as any);
    expect(report.total_ambientes).toBe(2);
    expect(report.valid_ambientes).toBe(2);
    expect(report.quality_score).toBe(1);
  });

  it("counts flagged ambientes", () => {
    const ambientes = [
      { nome: "Sala", area_m2: 25, perimetro_m: 20, pe_direito_m: 2.8, acabamentos: { piso: "a", parede: "b", forro: "c" }, aberturas: [], confidence: 0.95 },
      { nome: "Banheiro", area_m2: 50, perimetro_m: 28, pe_direito_m: 2.8, acabamentos: { piso: "a", parede: "b", forro: "c" }, aberturas: [], confidence: 0.90 },
    ];
    const report = computeQualityReport(ambientes as any);
    expect(report.flagged_ambientes).toBeGreaterThan(0);
    expect(report.flags_summary).toHaveProperty("area_fora_range_banheiro");
    expect(report.quality_score).toBeLessThan(1);
  });
});
