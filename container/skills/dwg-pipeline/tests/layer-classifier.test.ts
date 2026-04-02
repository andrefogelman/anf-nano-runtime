import { describe, it, expect } from "vitest";
import { classifyByName, classifyByContent } from "../src/layer-classifier.js";
import type { DxfLayer, DxfEntity, DxfBlock, DxfText } from "../src/types.js";

describe("classifyByName", () => {
  it("classifies wall/parede layers as arq", () => {
    expect(classifyByName("ARQ-PAREDE")?.disciplina).toBe("arq");
    expect(classifyByName("WALL-01")?.disciplina).toBe("arq");
    expect(classifyByName("ALVENARIA")?.disciplina).toBe("arq");
  });

  it("classifies hydraulic layers as hid", () => {
    expect(classifyByName("HID-TUB-AF")?.disciplina).toBe("hid");
    expect(classifyByName("AGUA-FRIA")?.disciplina).toBe("hid");
    expect(classifyByName("ESGOTO")?.disciplina).toBe("hid");
    expect(classifyByName("PLUVIAL")?.disciplina).toBe("hid");
  });

  it("classifies electrical layers as ele", () => {
    expect(classifyByName("ELE-TOMADA")?.disciplina).toBe("ele");
    expect(classifyByName("ILUMINACAO")?.disciplina).toBe("ele");
    expect(classifyByName("CONDUTO")?.disciplina).toBe("ele");
  });

  it("classifies structural layers as est", () => {
    expect(classifyByName("EST-PILAR")?.disciplina).toBe("est");
    expect(classifyByName("VIGAS")?.disciplina).toBe("est");
    expect(classifyByName("LAJE")?.disciplina).toBe("est");
    expect(classifyByName("FUNDACAO")?.disciplina).toBe("est");
  });

  it("classifies dimension layers as cotas", () => {
    expect(classifyByName("COTAS")?.disciplina).toBe("cotas");
    expect(classifyByName("DIM-GERAL")?.disciplina).toBe("cotas");
  });

  it("classifies text layers as anotacoes", () => {
    expect(classifyByName("TEXTO-GERAL")?.disciplina).toBe("anotacoes");
    expect(classifyByName("ANOTACOES")?.disciplina).toBe("anotacoes");
  });

  it("classifies layer 0 and Defpoints as ignorar", () => {
    expect(classifyByName("0")?.disciplina).toBe("ignorar");
    expect(classifyByName("Defpoints")?.disciplina).toBe("ignorar");
  });

  it("returns null for unrecognized layer names", () => {
    expect(classifyByName("XPTO-LAYER")).toBeNull();
    expect(classifyByName("MISC_01")).toBeNull();
    expect(classifyByName("Custom Layer")).toBeNull();
  });

  it("has confidence 0.95 for regex matches", () => {
    const result = classifyByName("ARQ-PAREDE");
    expect(result?.confidence).toBe(0.95);
    expect(result?.method).toBe("regex");
  });
});

describe("classifyByContent", () => {
  const makeLayer = (name: string, counts: Record<string, number> = {}): DxfLayer => ({
    name,
    color: 7,
    is_on: true,
    is_frozen: false,
    entity_counts: counts,
  });

  it("classifies layer with electrical blocks as ele", () => {
    const layer = makeLayer("LAYER-X");
    const entities: DxfEntity[] = [];
    const blocks: DxfBlock[] = [
      { name: "TOMADA_2P", position: [100, 200], rotation: 0, scale_x: 1, scale_y: 1, layer: "LAYER-X", count: 10 },
    ];
    const texts: DxfText[] = [];

    const result = classifyByContent(layer, entities, blocks, texts);
    expect(result?.disciplina).toBe("ele");
    expect(result?.confidence).toBe(0.85);
  });

  it("classifies layer with small circles as hid", () => {
    const layer = makeLayer("LAYER-Y");
    const entities: DxfEntity[] = [
      { type: "CIRCLE", layer: "LAYER-Y", center: [100, 100], radius: 25 },
      { type: "CIRCLE", layer: "LAYER-Y", center: [200, 200], radius: 30 },
      { type: "CIRCLE", layer: "LAYER-Y", center: [300, 300], radius: 40 },
    ];
    const blocks: DxfBlock[] = [];
    const texts: DxfText[] = [];

    const result = classifyByContent(layer, entities, blocks, texts);
    expect(result?.disciplina).toBe("hid");
  });

  it("classifies layer with large closed polylines as arq", () => {
    const layer = makeLayer("LAYER-Z");
    const entities: DxfEntity[] = [
      { type: "LWPOLYLINE", layer: "LAYER-Z", vertices: [[0, 0], [5000, 0], [5000, 4000], [0, 4000]], is_closed: true, area: 20_000_000, length: 18000 },
      { type: "LWPOLYLINE", layer: "LAYER-Z", vertices: [[6000, 0], [10000, 0], [10000, 3000], [6000, 3000]], is_closed: true, area: 12_000_000, length: 14000 },
    ];
    const blocks: DxfBlock[] = [];
    const texts: DxfText[] = [];

    const result = classifyByContent(layer, entities, blocks, texts);
    expect(result?.disciplina).toBe("arq");
  });

  it("classifies layer with many DIMENSION entities as cotas", () => {
    const layer = makeLayer("LAYER-D", { DIMENSION: 10 });
    const entities: DxfEntity[] = [];
    const blocks: DxfBlock[] = [];
    const texts: DxfText[] = [];

    const result = classifyByContent(layer, entities, blocks, texts);
    expect(result?.disciplina).toBe("cotas");
  });

  it("returns null for ambiguous layers", () => {
    const layer = makeLayer("UNKNOWN-LAYER");
    const entities: DxfEntity[] = [
      { type: "LINE", layer: "UNKNOWN-LAYER", start: [0, 0], end: [100, 100], length: 141 },
    ];
    const blocks: DxfBlock[] = [];
    const texts: DxfText[] = [];

    const result = classifyByContent(layer, entities, blocks, texts);
    expect(result).toBeNull();
  });
});
