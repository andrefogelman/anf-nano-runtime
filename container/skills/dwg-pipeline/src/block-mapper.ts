// container/skills/dwg-pipeline/src/block-mapper.ts
import type {
  DxfBlock,
  MappedBlock,
  ComponenteDisciplina,
} from "./types.js";
import {
  CONFIDENCE_BLOCK_REGEX,
  CONFIDENCE_BLOCK_LLM,
} from "./types.js";
import { getBlockMappings, saveBlockMapping } from "./supabase.js";
import {
  BLOCK_CLASSIFICATION_PROMPT,
  buildBlockClassificationMessage,
} from "./prompts.js";

// ── Auto-identification patterns (from spec) ────────────────────────────────

interface BlockPattern {
  pattern: RegExp;
  componente: string;
  disciplina: ComponenteDisciplina;
  unidade: string;
}

const BLOCK_PATTERNS: BlockPattern[] = [
  { pattern: /tomada|tug|tue/i, componente: "tomada", disciplina: "ele", unidade: "pt" },
  { pattern: /ponto.*luz|ilum|lum/i, componente: "ponto_iluminacao", disciplina: "ele", unidade: "pt" },
  { pattern: /interr|switch/i, componente: "interruptor", disciplina: "ele", unidade: "un" },
  { pattern: /registro|reg/i, componente: "registro", disciplina: "hid", unidade: "un" },
  { pattern: /ralo/i, componente: "ralo", disciplina: "hid", unidade: "un" },
  { pattern: /porta|door|^p\d+$/i, componente: "porta", disciplina: "arq", unidade: "un" },
  { pattern: /janela|window|^j\d+$/i, componente: "janela", disciplina: "arq", unidade: "un" },
  { pattern: /pilar|col/i, componente: "pilar", disciplina: "est", unidade: "un" },
];

/**
 * Try to auto-identify a block by its name using regex patterns.
 * Returns null if no pattern matches.
 */
export function identifyByName(blockName: string): {
  componente: string;
  disciplina: ComponenteDisciplina;
  unidade: string;
} | null {
  for (const { pattern, componente, disciplina, unidade } of BLOCK_PATTERNS) {
    if (pattern.test(blockName)) {
      return { componente, disciplina, unidade };
    }
  }
  return null;
}

/**
 * Classify an unknown block using the LLM API.
 */
async function classifyByLlm(
  block: DxfBlock
): Promise<{
  componente: string;
  disciplina: ComponenteDisciplina;
  unidade: string;
  confidence: number;
}> {
  const userMessage = buildBlockClassificationMessage(
    block.name,
    block.internal_entities ?? [],
    block.count,
    block.layer
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
        system: BLOCK_CLASSIFICATION_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      console.error(`LLM block classification failed: ${response.status}`);
      return { componente: "desconhecido", disciplina: "geral", unidade: "un", confidence: 0 };
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    const text = data.content?.[0]?.text ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { componente: "desconhecido", disciplina: "geral", unidade: "un", confidence: 0 };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      componente: string;
      disciplina: string;
      unidade: string;
      justificativa: string;
    };

    const validDisciplinas = ["arq", "est", "hid", "ele", "geral"];
    const disciplina = validDisciplinas.includes(parsed.disciplina)
      ? (parsed.disciplina as ComponenteDisciplina)
      : "geral";

    return {
      componente: parsed.componente || "desconhecido",
      disciplina,
      unidade: parsed.unidade || "un",
      confidence: parsed.componente === "desconhecido" ? 0 : CONFIDENCE_BLOCK_LLM,
    };
  } catch (error) {
    console.error(`LLM block classification error for ${block.name}:`, error);
    return { componente: "desconhecido", disciplina: "geral", unidade: "un", confidence: 0 };
  }
}

/**
 * Map all blocks in a DXF file to known components.
 *
 * Flow:
 * 1. Check cached mappings (ob_block_mappings for this org)
 * 2. Auto-identify by block name regex
 * 3. LLM fallback for unknown blocks
 * 4. Save new mappings to cache
 *
 * @param blocks - Deduplicated list of blocks (one entry per unique block name)
 * @param orgId - Organization ID for cache lookup
 * @returns Mapped blocks with components, disciplines, and review flags
 */
export async function mapBlocks(
  blocks: DxfBlock[],
  orgId: string
): Promise<MappedBlock[]> {
  // Load cached mappings
  const cached = await getBlockMappings(orgId);
  const cachedMap = new Map(cached.map((m) => [m.block_name, m]));

  const results: MappedBlock[] = [];

  for (const block of blocks) {
    // 1. Check cache
    const cachedMapping = cachedMap.get(block.name);
    if (cachedMapping) {
      results.push({
        name: block.name,
        componente: cachedMapping.componente,
        disciplina: cachedMapping.disciplina,
        unidade: cachedMapping.unidade,
        contagem: block.count,
        confidence: cachedMapping.confirmed ? 1.0 : 0.8,
        needs_review: !cachedMapping.confirmed,
      });
      continue;
    }

    // 2. Auto-identify by name
    const autoResult = identifyByName(block.name);
    if (autoResult) {
      results.push({
        name: block.name,
        componente: autoResult.componente,
        disciplina: autoResult.disciplina,
        unidade: autoResult.unidade,
        contagem: block.count,
        confidence: CONFIDENCE_BLOCK_REGEX,
        needs_review: false,
      });

      // Save to cache
      await saveBlockMapping(orgId, {
        block_name: block.name,
        componente: autoResult.componente,
        disciplina: autoResult.disciplina,
        unidade: autoResult.unidade,
        confirmed: false,
      });
      continue;
    }

    // 3. LLM fallback
    const llmResult = await classifyByLlm(block);
    const needsReview = llmResult.componente === "desconhecido" || llmResult.confidence < CONFIDENCE_BLOCK_LLM;

    results.push({
      name: block.name,
      componente: llmResult.componente,
      disciplina: llmResult.disciplina,
      unidade: llmResult.unidade,
      contagem: block.count,
      confidence: llmResult.confidence,
      needs_review: needsReview,
    });

    // Save to cache (even if unknown — avoids re-querying LLM)
    if (llmResult.confidence > 0) {
      await saveBlockMapping(orgId, {
        block_name: block.name,
        componente: llmResult.componente,
        disciplina: llmResult.disciplina,
        unidade: llmResult.unidade,
        confirmed: false,
      });
    }
  }

  return results;
}
