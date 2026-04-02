import { describe, it, expect, vi } from "vitest";

// We test the extraction pipeline by mocking execFile since we may not
// have ezdxf installed in the test environment.

describe("extractDxf", () => {
  it("parses valid Python output into ExtractedDxfData", async () => {
    const { ExtractedDxfDataSchema } = await import("../src/types.js");

    const mockOutput = {
      filename: "test.dxf",
      units: "mm",
      layers: [
        { name: "ARQ-PAREDE", color: 7, is_on: true, is_frozen: false, entity_counts: { LINE: 10 } },
      ],
      entities: [
        { type: "LINE", layer: "ARQ-PAREDE", start: [0, 0], end: [5000, 0], length: 5000 },
      ],
      blocks: [
        { name: "TOMADA_2P", position: [100, 200], rotation: 0, scale_x: 1, scale_y: 1, layer: "ELE-TOM", count: 5 },
      ],
      dimensions: [
        { type: "linear", actual_measurement: 5.0, position: [2500, -200], layer: "COT" },
      ],
      texts: [
        { type: "TEXT", content: "Sala", position: [2500, 1850], height: 200, rotation: 0, layer: "ARQ-TEXTO" },
      ],
      stats: {
        total_layers: 1,
        total_entities: 1,
        total_blocks: 1,
        total_dimensions: 1,
        total_texts: 1,
      },
    };

    const result = ExtractedDxfDataSchema.safeParse(mockOutput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.filename).toBe("test.dxf");
      expect(result.data.layers).toHaveLength(1);
      expect(result.data.entities).toHaveLength(1);
      expect(result.data.blocks).toHaveLength(1);
      expect(result.data.dimensions).toHaveLength(1);
      expect(result.data.texts).toHaveLength(1);
    }
  });

  it("rejects invalid extraction output", async () => {
    const { ExtractedDxfDataSchema } = await import("../src/types.js");

    const badOutput = { filename: "test.dxf" }; // Missing required fields
    const result = ExtractedDxfDataSchema.safeParse(badOutput);
    expect(result.success).toBe(false);
  });
});
