// container/skills/pdf-pipeline/src/classification.ts
import type { ExtractedPage, PageTipo, ClassifiedPage } from "./types.js";
import { PageTipo as PageTipoEnum } from "./types.js";
import { CLASSIFICATION_SYSTEM_PROMPT } from "./prompts.js";

interface ClassificationResult {
  tipo: PageTipo;
  prancha: string;
  pavimento: string;
  confidence: number;
}

/**
 * Build the classification prompt for a single page.
 */
export function buildClassificationPrompt(page: ExtractedPage): string {
  return `Classify this construction drawing page.

Page number: ${page.page_number}
OCR was used: ${page.ocr_used ? "yes (scanned page)" : "no (native PDF text)"}
Character count: ${page.char_count}

--- EXTRACTED TEXT ---
${page.text_content}
--- END TEXT ---`;
}

/**
 * Parse the LLM classification response.
 * Handles raw JSON, markdown-wrapped JSON, and malformed responses.
 */
export function parseClassificationResponse(response: string): ClassificationResult {
  const defaultResult: ClassificationResult = {
    tipo: "outro",
    prancha: "UNKNOWN",
    pavimento: "indefinido",
    confidence: 0.3,
  };

  try {
    // Strip markdown code blocks if present
    let jsonStr = response.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    // Validate tipo against enum
    const tipoResult = PageTipoEnum.safeParse(parsed.tipo);
    const tipo: PageTipo = tipoResult.success ? tipoResult.data : "outro";

    return {
      tipo,
      prancha: typeof parsed.prancha === "string" ? parsed.prancha : "UNKNOWN",
      pavimento: typeof parsed.pavimento === "string" ? parsed.pavimento : "indefinido",
      confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.3,
    };
  } catch {
    return defaultResult;
  }
}

/**
 * Classify a single extracted page using the LLM.
 * Calls the Anthropic API via the proxy.
 */
export async function classifyPage(page: ExtractedPage): Promise<ClassifiedPage> {
  const baseUrl = process.env.ANTHROPIC_BASE_URL ?? "http://localhost:8100";
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN ?? "";

  const userPrompt = buildClassificationPrompt(page);

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
      system: CLASSIFICATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Classification API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as any;
  const text = data.content?.[0]?.text ?? "";
  const classification = parseClassificationResponse(text);

  return {
    ...page,
    tipo: classification.tipo,
    prancha: classification.prancha,
    pavimento: classification.pavimento,
    classification_confidence: classification.confidence,
  };
}

/**
 * Classify all extracted pages.
 */
export async function classifyAllPages(pages: ExtractedPage[]): Promise<ClassifiedPage[]> {
  const results: ClassifiedPage[] = [];
  for (const page of pages) {
    const classified = await classifyPage(page);
    results.push(classified);
  }
  return results;
}
