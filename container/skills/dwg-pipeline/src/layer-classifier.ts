// container/skills/dwg-pipeline/src/layer-classifier.ts
import type {
  DxfLayer,
  DxfEntity,
  DxfBlock,
  DxfText,
  ClassifiedLayer,
  Disciplina,
} from "./types.js";
import {
  CONFIDENCE_LAYER_REGEX,
  CONFIDENCE_LAYER_CONTENT,
  CONFIDENCE_LAYER_LLM,
  MIN_ROOM_AREA_MM2,
} from "./types.js";
import { getLayerMappings, saveLayerMapping } from "./supabase.js";
import {
  LAYER_CLASSIFICATION_PROMPT,
  buildLayerClassificationMessage,
} from "./prompts.js";

// ── Step 1: Regex-based classification ───────────────────────────────────────

const LAYER_REGEX_MAP: Array<{ pattern: RegExp; disciplina: Disciplina }> = [
  { pattern: /^0$|defpoints/i, disciplina: "ignorar" },
  { pattern: /pare|wall|alven/i, disciplina: "arq" },
  { pattern: /hid|tub|agua|esg|pluv/i, disciplina: "hid" },
  { pattern: /\bele[-_]|ilum|tomad|interru|condut/i, disciplina: "ele" },
  { pattern: /\best[-_]|pilar|viga|laje|funda/i, disciplina: "est" },
  { pattern: /cot|dim/i, disciplina: "cotas" },
  { pattern: /text|anot/i, disciplina: "anotacoes" },
];

/**
 * Step 1: Classify a layer by its name using regex patterns.
 * Returns null if no pattern matches.
 */
export function classifyByName(layerName: string): ClassifiedLayer | null {
  for (const { pattern, disciplina } of LAYER_REGEX_MAP) {
    if (pattern.test(layerName)) {
      return {
        name: layerName,
        disciplina,
        confidence: CONFIDENCE_LAYER_REGEX,
        method: "regex",
      };
    }
  }
  return null;
}

// ── Step 2: Content-based classification ─────────────────────────────────────

/**
 * Step 2: Classify a layer by analyzing the content of its entities.
 * Returns null if no clear pattern is detected.
 */
export function classifyByContent(
  layer: DxfLayer,
  entities: DxfEntity[],
  blocks: DxfBlock[],
  texts: DxfText[]
): ClassifiedLayer | null {
  const layerEntities = entities.filter((e) => e.layer === layer.name);
  const layerBlocks = blocks.filter((b) => b.layer === layer.name);
  const layerTexts = texts.filter((t) => t.layer === layer.name);

  // Check for electrical block patterns (tomada, interruptor, etc.)
  const electricalBlocks = layerBlocks.filter((b) =>
    /tomada|tug|tue|ponto.*luz|ilum|lum|interr|switch/i.test(b.name)
  );
  if (electricalBlocks.length > 0) {
    return {
      name: layer.name,
      disciplina: "ele",
      confidence: CONFIDENCE_LAYER_CONTENT,
      method: "content",
    };
  }

  // Check for small circles (hydraulic connections, r=20-50mm typical)
  const smallCircles = layerEntities.filter(
    (e) => e.type === "CIRCLE" && e.radius !== undefined && e.radius >= 15 && e.radius <= 60
  );
  if (smallCircles.length >= 3) {
    return {
      name: layer.name,
      disciplina: "hid",
      confidence: CONFIDENCE_LAYER_CONTENT,
      method: "content",
    };
  }

  // Check for large closed polylines (room boundaries)
  const largeClosedPolylines = layerEntities.filter(
    (e) =>
      e.type === "LWPOLYLINE" &&
      e.is_closed === true &&
      e.area !== undefined &&
      e.area > MIN_ROOM_AREA_MM2
  );
  if (largeClosedPolylines.length >= 2) {
    return {
      name: layer.name,
      disciplina: "arq",
      confidence: CONFIDENCE_LAYER_CONTENT,
      method: "content",
    };
  }

  // Check for DIMENSION entities
  const counts = layer.entity_counts;
  if (counts["DIMENSION"] && counts["DIMENSION"] > 5) {
    return {
      name: layer.name,
      disciplina: "cotas",
      confidence: CONFIDENCE_LAYER_CONTENT,
      method: "content",
    };
  }

  // Check for predominantly TEXT/MTEXT content
  if (layerTexts.length > 5 && layerEntities.length < layerTexts.length * 2) {
    return {
      name: layer.name,
      disciplina: "anotacoes",
      confidence: CONFIDENCE_LAYER_CONTENT,
      method: "content",
    };
  }

  // Check for hydraulic blocks (registro, ralo)
  const hydraulicBlocks = layerBlocks.filter((b) =>
    /registro|reg|ralo/i.test(b.name)
  );
  if (hydraulicBlocks.length > 0) {
    return {
      name: layer.name,
      disciplina: "hid",
      confidence: CONFIDENCE_LAYER_CONTENT,
      method: "content",
    };
  }

  // Check for structural blocks (pilar, coluna)
  const structuralBlocks = layerBlocks.filter((b) =>
    /pilar|col|viga|beam/i.test(b.name)
  );
  if (structuralBlocks.length > 0) {
    return {
      name: layer.name,
      disciplina: "est",
      confidence: CONFIDENCE_LAYER_CONTENT,
      method: "content",
    };
  }

  return null;
}

// ── Step 3: LLM-based classification ─────────────────────────────────────────

/**
 * Step 3: Classify a layer using an LLM API call.
 * This is the fallback when regex and content heuristics fail.
 */
export async function classifyByLlm(
  layer: DxfLayer,
  sampleEntities: DxfEntity[],
  blockNames: string[],
  textContents: string[]
): Promise<ClassifiedLayer> {
  const userMessage = buildLayerClassificationMessage(
    layer.name,
    sampleEntities.slice(0, 10),
    blockNames,
    textContents
  );

  try {
    const baseUrl = process.env.ANTHROPIC_BASE_URL || "http://localhost:8100";
    const authToken = process.env.ANTHROPIC_AUTH_TOKEN || "";

    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": authToken,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 256,
        system: LAYER_CLASSIFICATION_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      console.error(`LLM layer classification failed: ${response.status} ${response.statusText}`);
      return {
        name: layer.name,
        disciplina: "ignorar",
        confidence: 0,
        method: "llm",
      };
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    const text = data.content?.[0]?.text ?? "";

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(`LLM returned non-JSON for layer ${layer.name}: ${text.slice(0, 100)}`);
      return {
        name: layer.name,
        disciplina: "ignorar",
        confidence: 0,
        method: "llm",
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      disciplina: string;
      justificativa: string;
    };

    const validDisciplinas = ["arq", "est", "hid", "ele", "cotas", "anotacoes", "ignorar"];
    const disciplina = validDisciplinas.includes(parsed.disciplina)
      ? (parsed.disciplina as Disciplina)
      : "ignorar";

    return {
      name: layer.name,
      disciplina,
      confidence: CONFIDENCE_LAYER_LLM,
      method: "llm",
    };
  } catch (error) {
    console.error(`LLM layer classification error for ${layer.name}:`, error);
    return {
      name: layer.name,
      disciplina: "ignorar",
      confidence: 0,
      method: "llm",
    };
  }
}

// ── Main classifier ──────────────────────────────────────────────────────────

/**
 * Classify all layers in a DXF file using a 3-step approach:
 * 1. Check cached mappings (ob_layer_mappings for this org)
 * 2. Regex match on layer name
 * 3. Content-based heuristic analysis
 * 4. LLM fallback for remaining layers
 *
 * New classifications are saved to ob_layer_mappings for future reuse.
 */
export async function classifyLayers(
  layers: DxfLayer[],
  entities: DxfEntity[],
  blocks: DxfBlock[],
  texts: DxfText[],
  orgId: string
): Promise<ClassifiedLayer[]> {
  // Load cached mappings
  const cached = await getLayerMappings(orgId);
  const cachedMap = new Map(cached.map((m) => [m.layer_name, m]));

  const results: ClassifiedLayer[] = [];

  for (const layer of layers) {
    // Skip frozen or off layers
    if (layer.is_frozen || !layer.is_on) {
      results.push({
        name: layer.name,
        disciplina: "ignorar",
        confidence: 1.0,
        method: "regex",
      });
      continue;
    }

    // Check cache first
    const cachedMapping = cachedMap.get(layer.name);
    if (cachedMapping) {
      results.push({
        name: layer.name,
        disciplina: cachedMapping.disciplina,
        confidence: cachedMapping.confirmed ? 1.0 : 0.8,
        method: "cached",
      });
      continue;
    }

    // Step 1: Regex
    const regexResult = classifyByName(layer.name);
    if (regexResult) {
      results.push(regexResult);
      // Save to cache (unconfirmed)
      await saveLayerMapping(orgId, {
        layer_name: layer.name,
        disciplina: regexResult.disciplina,
        confirmed: false,
      });
      continue;
    }

    // Step 2: Content
    const contentResult = classifyByContent(layer, entities, blocks, texts);
    if (contentResult) {
      results.push(contentResult);
      await saveLayerMapping(orgId, {
        layer_name: layer.name,
        disciplina: contentResult.disciplina,
        confirmed: false,
      });
      continue;
    }

    // Step 3: LLM fallback
    const layerEntities = entities.filter((e) => e.layer === layer.name);
    const layerBlocks = blocks.filter((b) => b.layer === layer.name);
    const layerTexts = texts.filter((t) => t.layer === layer.name);

    const llmResult = await classifyByLlm(
      layer,
      layerEntities.slice(0, 10),
      layerBlocks.map((b) => b.name),
      layerTexts.map((t) => t.content)
    );
    results.push(llmResult);

    if (llmResult.confidence > 0) {
      await saveLayerMapping(orgId, {
        layer_name: layer.name,
        disciplina: llmResult.disciplina,
        confirmed: false,
      });
    }
  }

  return results;
}
