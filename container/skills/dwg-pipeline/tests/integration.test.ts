import { describe, it, expect, vi, beforeAll } from "vitest";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { access, constants } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE_DXF = join(__dirname, "fixtures", "sample.dxf");

describe("DWG Pipeline Integration", () => {
  let hasPython = false;
  let hasEzdxf = false;

  beforeAll(async () => {
    // Check if python3 and ezdxf are available
    try {
      const { execFile } = await import("node:child_process");
      await new Promise<void>((resolve, reject) => {
        execFile("python3", ["-c", "import ezdxf; print('ok')"], (err, stdout) => {
          if (err) reject(err);
          else {
            hasPython = true;
            hasEzdxf = stdout.trim() === "ok";
            resolve();
          }
        });
      });
    } catch {
      // Python or ezdxf not available — skip integration tests
    }
  });

  it("sample.dxf fixture exists", async () => {
    try {
      await access(SAMPLE_DXF, constants.R_OK);
    } catch {
      console.warn("sample.dxf not found — run create_sample.py to generate it");
      return;
    }
  });

  it("Python extractor produces valid JSON from sample.dxf", async () => {
    if (!hasPython || !hasEzdxf) {
      console.warn("Skipping: python3 or ezdxf not available");
      return;
    }

    try {
      await access(SAMPLE_DXF, constants.R_OK);
    } catch {
      console.warn("Skipping: sample.dxf not found");
      return;
    }

    const { extractDxf } = await import("../src/extractor.js");
    const data = await extractDxf(SAMPLE_DXF);

    // Verify structure
    expect(data.filename).toBe("sample.dxf");
    expect(data.units).toBe("mm");
    expect(data.layers.length).toBeGreaterThanOrEqual(4);
    expect(data.stats.total_entities).toBeGreaterThan(0);
    expect(data.stats.total_blocks).toBeGreaterThan(0);

    // Verify specific content
    const arqLayer = data.layers.find((l) => l.name === "ARQ-PAREDE");
    expect(arqLayer).toBeDefined();
    expect(arqLayer?.is_on).toBe(true);

    // Verify tomada block was extracted
    const tomadaBlock = data.blocks.find((b) => b.name === "TOMADA_2P");
    expect(tomadaBlock).toBeDefined();
    expect(tomadaBlock?.count).toBe(5);

    // Verify texts
    const salaText = data.texts.find((t) => t.content === "Sala");
    expect(salaText).toBeDefined();

    // Verify closed polylines (rooms)
    const closedPolys = data.entities.filter(
      (e) => e.type === "LWPOLYLINE" && e.is_closed
    );
    expect(closedPolys.length).toBeGreaterThanOrEqual(2);
  });

  it("layer classifier correctly classifies sample layers", async () => {
    const { classifyByName } = await import("../src/layer-classifier.js");

    expect(classifyByName("ARQ-PAREDE")?.disciplina).toBe("arq");
    expect(classifyByName("ELE-TOMADA")?.disciplina).toBe("ele");
    expect(classifyByName("HID-TUB-AF")?.disciplina).toBe("hid");
    expect(classifyByName("COT-COTAS")?.disciplina).toBe("cotas");
  });

  it("block mapper correctly identifies TOMADA_2P", async () => {
    const { identifyByName } = await import("../src/block-mapper.js");

    const result = identifyByName("TOMADA_2P");
    expect(result).toEqual({
      componente: "tomada",
      disciplina: "ele",
      unidade: "pt",
    });
  });

  it("end-to-end: sample.dxf produces valid DwgPageOutput", async () => {
    if (!hasPython || !hasEzdxf) {
      console.warn("Skipping: python3 or ezdxf not available");
      return;
    }

    try {
      await access(SAMPLE_DXF, constants.R_OK);
    } catch {
      console.warn("Skipping: sample.dxf not found");
      return;
    }

    // Mock supabase calls for layer/block mapping cache
    vi.doMock("../src/supabase.js", () => ({
      getLayerMappings: vi.fn().mockResolvedValue([]),
      saveLayerMapping: vi.fn().mockResolvedValue(undefined),
      getBlockMappings: vi.fn().mockResolvedValue([]),
      saveBlockMapping: vi.fn().mockResolvedValue(undefined),
    }));

    const { extractDxf } = await import("../src/extractor.js");
    const { classifyByName } = await import("../src/layer-classifier.js");
    const { identifyByName } = await import("../src/block-mapper.js");
    const { DwgPageOutputSchema } = await import("../src/types.js");

    // Extract
    const data = await extractDxf(SAMPLE_DXF);

    // Classify layers (regex only — no LLM in tests)
    const classifiedLayers = data.layers.map((layer) => {
      const result = classifyByName(layer.name);
      return result ?? { name: layer.name, disciplina: "ignorar" as const, confidence: 0, method: "regex" as const };
    });

    // Map blocks (regex only — no LLM in tests)
    const mappedBlocks = data.blocks.map((block) => {
      const result = identifyByName(block.name);
      return {
        name: block.name,
        componente: result?.componente ?? "desconhecido",
        disciplina: result?.disciplina ?? ("geral" as const),
        unidade: result?.unidade ?? "un",
        contagem: block.count,
        confidence: result ? 0.95 : 0,
        needs_review: !result,
      };
    });

    // Assemble output (with mocked text association)
    vi.doMock("../src/extractor.js", () => ({
      extractDxf: vi.fn().mockResolvedValue(data),
      associateTextsToRooms: vi.fn().mockResolvedValue({}),
    }));

    const { assembleOutput } = await import("../src/structured-output.js");
    const output = await assembleOutput(data, classifiedLayers, mappedBlocks);

    // Validate
    expect(output.source).toBe("dwg");
    expect(output.blocos.length).toBeGreaterThan(0);

    const tomada = output.blocos.find((b) => b.nome === "TOMADA_2P");
    expect(tomada).toBeDefined();
    expect(tomada?.contagem).toBe(5);
    expect(tomada?.disciplina).toBe("ele");

    // Schema validation
    const validation = DwgPageOutputSchema.safeParse(output);
    expect(validation.success).toBe(true);
  });
});
