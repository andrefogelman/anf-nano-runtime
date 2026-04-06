// container/skills/dwg-pipeline/src/structured-output.ts
import type {
  ExtractedDxfData,
  ClassifiedLayer,
  MappedBlock,
  DwgPageOutput,
  DwgBloco,
  DwgTubulacao,
  Ambiente,
  Abertura,
  DxfEntity,
  DxfText,
  DxfHatch,
} from "./types.js";
import {
  DwgPageOutputSchema,
  CONFIDENCE_DXF_GEOMETRY,
  CONFIDENCE_TEXT_POSITION,
  MIN_ROOM_AREA_MM2,
} from "./types.js";
import { associateTextsToRooms } from "./extractor.js";
import { validateArea } from "../../shared/area-validator.js";

/**
 * Normalize a value from drawing units to meters.
 */
function toMeters(value: number, units: string): number {
  const factors: Record<string, number> = {
    mm: 0.001,
    cm: 0.01,
    m: 1.0,
    in: 0.0254,
    ft: 0.3048,
    unitless: 0.001, // assume mm
  };
  return value * (factors[units] ?? 0.001);
}

/**
 * Normalize an area value from drawing units squared to square meters.
 */
function toSquareMeters(value: number, units: string): number {
  const factor = toMeters(1, units);
  return value * factor * factor;
}

/**
 * Detect the floor level (pavimento) from text content.
 */
function detectPavimento(texts: DxfText[]): string {
  const allText = texts.map((t) => t.content.toLowerCase()).join(" ");

  if (/subsolo|ss|garagem.*sub/i.test(allText)) return "subsolo";
  if (/cobertura|telhado|coberta/i.test(allText)) return "cobertura";
  if (/superior|2.*pav|segundo|1.*andar/i.test(allText)) return "superior";
  if (/terreo|terr[eé]o|t[eé]rreo|pav.*t[eé]rr/i.test(allText)) return "terreo";

  return "terreo"; // default
}

/**
 * Detect the prancha (sheet) name from text content.
 */
function detectPrancha(texts: DxfText[]): string {
  for (const text of texts) {
    // Match patterns like ARQ-01, EST-02, HID-01, ELE-03
    const match = text.content.match(/\b(ARQ|EST|HID|ELE|PLB|COB|SIT|CRT|FCH)-?\d{1,3}\b/i);
    if (match) return match[0].toUpperCase();
  }
  return "DWG-01";
}

/**
 * Detect the page type based on classified layers and content.
 */
function detectTipo(
  classifiedLayers: ClassifiedLayer[],
  texts: DxfText[]
): string {
  const disciplinaCounts: Record<string, number> = {};
  for (const cl of classifiedLayers) {
    if (cl.disciplina !== "ignorar" && cl.disciplina !== "cotas" && cl.disciplina !== "anotacoes") {
      disciplinaCounts[cl.disciplina] = (disciplinaCounts[cl.disciplina] ?? 0) + 1;
    }
  }

  // Find dominant discipline
  const dominant = Object.entries(disciplinaCounts).sort((a, b) => b[1] - a[1])[0];
  if (!dominant) return "outro";

  const allText = texts.map((t) => t.content.toLowerCase()).join(" ");

  switch (dominant[0]) {
    case "arq":
      if (/corte|sec[çc][ãa]o/i.test(allText)) return "arquitetonico-corte";
      if (/fachada|eleva[çc][ãa]o/i.test(allText)) return "arquitetonico-fachada";
      if (/cobertura|telhado/i.test(allText)) return "arquitetonico-cobertura";
      if (/situa[çc][ãa]o|localiza/i.test(allText)) return "arquitetonico-situacao";
      return "arquitetonico-planta-baixa";
    case "est":
      if (/arma[çc][ãa]o|ferragem/i.test(allText)) return "estrutural-armacao";
      if (/detalhe/i.test(allText)) return "estrutural-detalhe";
      return "estrutural-forma";
    case "hid":
      if (/esgoto/i.test(allText)) return "hidraulico-esgoto";
      if (/pluv/i.test(allText)) return "hidraulico-pluvial";
      return "hidraulico-agua-fria";
    case "ele":
      if (/caminha|eletroduto/i.test(allText)) return "eletrico-caminhamento";
      if (/unifilar|quadro/i.test(allText)) return "eletrico-unifilar";
      return "eletrico-pontos";
    default:
      return "outro";
  }
}

/**
 * Compute the centroid of a set of vertices.
 */
function centroid(vertices: number[][]): [number, number] {
  let cx = 0, cy = 0;
  for (const v of vertices) {
    cx += v[0];
    cy += v[1];
  }
  return [cx / vertices.length, cy / vertices.length];
}

/**
 * Ray-casting point-in-polygon test.
 */
function pointInPolygon(px: number, py: number, polygon: [number, number][]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Find the first hatch whose centroid falls inside a polyline boundary.
 */
function findMatchingHatch(
  poly: DxfEntity,
  hatches: DxfHatch[],
  usedHatches: Set<number>,
): { hatch: DxfHatch; index: number } | undefined {
  if (!poly.vertices || poly.vertices.length < 3) return undefined;
  const polyVerts = poly.vertices as [number, number][];

  for (let i = 0; i < hatches.length; i++) {
    if (usedHatches.has(i)) continue;
    const hatch = hatches[i];
    if (!hatch.vertices || hatch.vertices.length < 3) continue;

    const [cx, cy] = centroid(hatch.vertices);
    if (pointInPolygon(cx, cy, polyVerts)) {
      return { hatch, index: i };
    }
  }
  return undefined;
}

/**
 * Build room environments from closed architectural polylines with associated texts.
 */
async function buildAmbientes(
  data: ExtractedDxfData,
  classifiedLayers: ClassifiedLayer[]
): Promise<Ambiente[]> {
  const arqLayers = new Set(
    classifiedLayers
      .filter((cl) => cl.disciplina === "arq")
      .map((cl) => cl.name)
  );

  // Find closed polylines on architectural layers (room boundaries)
  const roomPolylines = data.entities.filter(
    (e) =>
      e.type === "LWPOLYLINE" &&
      e.is_closed === true &&
      arqLayers.has(e.layer) &&
      e.area !== undefined &&
      e.area > MIN_ROOM_AREA_MM2
  );

  if (roomPolylines.length === 0) return [];

  // Filter hatches on architectural layers with meaningful area
  const arqHatches = (data.hatches ?? []).filter(
    (h) => arqLayers.has(h.layer) && toSquareMeters(h.area, data.units) > 0.5
  );
  const usedHatches = new Set<number>();

  // Find texts on architectural/annotation layers
  const relevantTexts = data.texts.filter(
    (t) =>
      arqLayers.has(t.layer) ||
      classifiedLayers.find((cl) => cl.name === t.layer)?.disciplina === "anotacoes"
  );

  // Associate texts to rooms via point-in-polygon
  let textToRoom: Record<number, number> = {};
  try {
    const polyData = roomPolylines.map((p) => ({
      vertices: p.vertices as [number, number][],
      is_closed: true,
    }));
    const textData = relevantTexts.map((t) => ({
      position: t.position,
      content: t.content,
    }));
    textToRoom = await associateTextsToRooms(textData, polyData);
  } catch {
    // Fallback: no text association
    console.warn("Text-to-room association failed, continuing without it");
  }

  // Build environments
  const ambientes: Ambiente[] = [];

  for (let ri = 0; ri < roomPolylines.length; ri++) {
    const poly = roomPolylines[ri];
    const area_m2 = toSquareMeters(poly.area ?? 0, data.units);
    const perimetro_m = toMeters(poly.length ?? 0, data.units);

    // Find texts inside this room
    const roomTexts: DxfText[] = [];
    for (const [textIdxStr, roomIdx] of Object.entries(textToRoom)) {
      if (roomIdx === ri) {
        roomTexts.push(relevantTexts[parseInt(textIdxStr)]);
      }
    }

    // Room name from the first text found inside
    const roomName = roomTexts.length > 0
      ? roomTexts[0].content
      : `Ambiente ${ri + 1}`;

    // Use hatch area when available (more precise than polyline boundary)
    let final_area_m2 = area_m2;
    const matchingHatch = findMatchingHatch(poly, arqHatches, usedHatches);
    if (matchingHatch) {
      usedHatches.add(matchingHatch.index);
      const hatchArea = toSquareMeters(matchingHatch.hatch.area, data.units);
      if (hatchArea > 0.5) {
        final_area_m2 = hatchArea;
      }
    }

    // Validate area against geometric and domain rules
    const validation = validateArea(final_area_m2, perimetro_m, roomName, CONFIDENCE_DXF_GEOMETRY);

    // Try to find pe_direito from dimensions (default to 2.80)
    const peDireito = findPeDireito(data, 2.80);

    // Find aberturas (doors/windows) associated with this room
    const aberturas = findAberturas(data, poly, classifiedLayers);

    ambientes.push({
      nome: roomName,
      area_m2: Math.round(final_area_m2 * 100) / 100,
      perimetro_m: Math.round(perimetro_m * 100) / 100,
      pe_direito_m: peDireito,
      acabamentos: {
        piso: extractAcabamento(roomTexts, "piso") || "a definir",
        parede: extractAcabamento(roomTexts, "parede") || "a definir",
        forro: extractAcabamento(roomTexts, "forro") || "a definir",
      },
      aberturas,
      confidence: validation.adjusted_confidence,
    });
  }

  return ambientes;
}

/**
 * Try to find pe_direito from corte drawings or text annotations.
 */
function findPeDireito(data: ExtractedDxfData, defaultValue: number): number {
  for (const text of data.texts) {
    const match = text.content.match(/p[eé]\s*direito\s*[=:]\s*(\d+[.,]\d+)/i);
    if (match) {
      return parseFloat(match[1].replace(",", "."));
    }
  }
  // Check dimensions for typical ceiling heights (2.5 - 3.5m)
  for (const dim of data.dimensions) {
    const m = toMeters(dim.actual_measurement, data.units);
    if (m >= 2.4 && m <= 4.0) {
      // Could be pe_direito, but not sure — use default
    }
  }
  return defaultValue;
}

/**
 * Find aberturas (doors/windows) near a room polyline.
 */
function findAberturas(
  data: ExtractedDxfData,
  _roomPolyline: DxfEntity,
  classifiedLayers: ClassifiedLayer[]
): Abertura[] {
  const aberturas: Abertura[] = [];
  const arqLayers = new Set(
    classifiedLayers
      .filter((cl) => cl.disciplina === "arq")
      .map((cl) => cl.name)
  );

  // Count door and window blocks on architectural layers
  const doorBlocks = data.blocks.filter(
    (b) => /porta|door|^p\d+$/i.test(b.name) && arqLayers.has(b.layer)
  );
  const windowBlocks = data.blocks.filter(
    (b) => /janela|window|^j\d+$/i.test(b.name) && arqLayers.has(b.layer)
  );

  // Simplified: add all found doors/windows (full implementation would check position proximity)
  for (const door of doorBlocks) {
    const dimMatch = door.name.match(/(\d+)/);
    const width = dimMatch ? `0.${dimMatch[1]}` : "0.80";
    aberturas.push({
      tipo: "porta",
      dim: `${width}x2.10`,
      qtd: 1,
      codigo: door.name.match(/^p\d+$/i) ? door.name.toUpperCase() : undefined,
    });
  }

  for (const window of windowBlocks) {
    aberturas.push({
      tipo: "janela",
      dim: "1.20x1.00",
      qtd: 1,
      codigo: window.name.match(/^j\d+$/i) ? window.name.toUpperCase() : undefined,
    });
  }

  return aberturas;
}

/**
 * Extract finishing material from room texts.
 */
function extractAcabamento(
  roomTexts: DxfText[],
  tipo: "piso" | "parede" | "forro"
): string | null {
  const patterns: Record<string, RegExp> = {
    piso: /piso[:\s]+(.+)/i,
    parede: /parede[:\s]+(.+)/i,
    forro: /forro[:\s]+(.+)/i,
  };

  for (const text of roomTexts) {
    const match = text.content.match(patterns[tipo]);
    if (match) return match[1].trim();
  }

  return null;
}

/**
 * Build tubulacoes from hydraulic layer entities.
 */
function buildTubulacoes(
  data: ExtractedDxfData,
  classifiedLayers: ClassifiedLayer[]
): DwgTubulacao[] {
  const hidLayers = new Set(
    classifiedLayers
      .filter((cl) => cl.disciplina === "hid")
      .map((cl) => cl.name)
  );

  const tubulacoes: DwgTubulacao[] = [];
  const layerLengths: Record<string, number> = {};

  // Sum line/polyline lengths per hydraulic layer
  for (const entity of data.entities) {
    if (!hidLayers.has(entity.layer)) continue;
    if (entity.type === "LINE" || entity.type === "LWPOLYLINE") {
      const length = entity.length ?? 0;
      layerLengths[entity.layer] = (layerLengths[entity.layer] ?? 0) + length;
    }
  }

  for (const [layerName, totalLength] of Object.entries(layerLengths)) {
    if (totalLength <= 0) continue;

    // Try to detect diameter and material from layer name or texts
    const diametro = detectDiametro(layerName, data.texts);
    const material = detectMaterial(layerName);

    tubulacoes.push({
      diametro_mm: diametro,
      material,
      comprimento_m: Math.round(toMeters(totalLength, data.units) * 100) / 100,
      layer: layerName,
    });
  }

  return tubulacoes;
}

function detectDiametro(layerName: string, _texts: DxfText[]): number {
  // Try to extract diameter from layer name
  const match = layerName.match(/(\d{2,3})(?:mm)?/);
  if (match) return parseInt(match[1]);

  // Default diameters by common layer name patterns
  if (/af|agua.*fria/i.test(layerName)) return 25;
  if (/aq|agua.*quente/i.test(layerName)) return 22;
  if (/esg/i.test(layerName)) return 100;
  if (/pluv/i.test(layerName)) return 75;

  return 50; // generic default
}

function detectMaterial(layerName: string): string {
  if (/pvc/i.test(layerName)) return "PVC";
  if (/cpvc/i.test(layerName)) return "CPVC";
  if (/ppr|pex/i.test(layerName)) return "PPR";
  if (/cobre|copper/i.test(layerName)) return "Cobre";
  if (/esg/i.test(layerName)) return "PVC";
  if (/af|agua.*fria/i.test(layerName)) return "PVC";
  if (/aq|agua.*quente/i.test(layerName)) return "CPVC";
  return "PVC";
}

/**
 * Build blocos output from mapped blocks.
 */
function buildBlocos(mappedBlocks: MappedBlock[]): DwgBloco[] {
  return mappedBlocks.map((mb) => ({
    nome: mb.name,
    contagem: mb.contagem,
    disciplina: mb.needs_review && mb.confidence === 0 ? null : mb.disciplina,
    confidence: mb.confidence,
    needs_review: mb.needs_review,
  }));
}

/**
 * Quality report summarising validation outcomes across all ambientes.
 */
export interface QualityReport {
  total_ambientes: number;
  valid_ambientes: number;
  flagged_ambientes: number;
  rejected_ambientes: number;
  flags_summary: Record<string, number>;
  quality_score: number; // 0.0-1.0
}

/**
 * Compute a quality report by re-validating each ambiente.
 */
export function computeQualityReport(ambientes: Ambiente[]): QualityReport {
  if (ambientes.length === 0) {
    return {
      total_ambientes: 0,
      valid_ambientes: 0,
      flagged_ambientes: 0,
      rejected_ambientes: 0,
      flags_summary: {},
      quality_score: 0,
    };
  }

  const flagsSummary: Record<string, number> = {};
  let valid = 0;
  let flagged = 0;
  let rejected = 0;

  for (const amb of ambientes) {
    const validation = validateArea(amb.area_m2, amb.perimetro_m, amb.nome, amb.confidence);

    if (validation.flags.length === 0) {
      valid++;
    } else if (validation.valid) {
      flagged++;
    } else {
      rejected++;
    }

    for (const flag of validation.flags) {
      flagsSummary[flag] = (flagsSummary[flag] ?? 0) + 1;
    }
  }

  const quality_score = ambientes.length > 0 ? valid / ambientes.length : 0;

  return {
    total_ambientes: ambientes.length,
    valid_ambientes: valid,
    flagged_ambientes: flagged,
    rejected_ambientes: rejected,
    flags_summary: flagsSummary,
    quality_score: Math.round(quality_score * 100) / 100,
  };
}

/**
 * Assemble the complete DwgPageOutput from all pipeline results.
 */
export async function assembleOutput(
  data: ExtractedDxfData,
  classifiedLayers: ClassifiedLayer[],
  mappedBlocks: MappedBlock[]
): Promise<DwgPageOutput> {
  const ambientes = await buildAmbientes(data, classifiedLayers);
  const tubulacoes = buildTubulacoes(data, classifiedLayers);
  const blocos = buildBlocos(mappedBlocks);

  const needsReview = blocos
    .filter((b) => b.needs_review)
    .map((b) => b.nome);

  const prancha = detectPrancha(data.texts);
  const pavimento = detectPavimento(data.texts);
  const tipo = detectTipo(classifiedLayers, data.texts);

  const output: DwgPageOutput = {
    prancha,
    tipo: tipo as DwgPageOutput["tipo"],
    source: "dwg",
    pavimento,
    page_number: 1, // DWG files are single-page (model space)
    ambientes,
    blocos,
    tubulacoes,
    needs_review: needsReview,
  };

  // Validate against schema
  const result = DwgPageOutputSchema.safeParse(output);
  if (!result.success) {
    console.error("DwgPageOutput validation failed:", result.error.issues);
    // Return a minimal valid output
    return {
      prancha,
      tipo: "outro",
      source: "dwg",
      pavimento,
      page_number: 1,
      ambientes: [],
      blocos,
      tubulacoes: [],
      needs_review: [
        ...needsReview,
        `VALIDATION_ERROR: ${result.error.issues.map((i) => i.message).join("; ")}`,
      ],
    };
  }

  return result.data;
}
