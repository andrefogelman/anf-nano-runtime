// container/skills/pdf-pipeline/src/interpretation.ts
import { readFile } from "node:fs/promises";
import type { ClassifiedPage, Ambiente, ReviewItem, InterpretedPage } from "./types.js";
import { AmbienteSchema, ReviewItemSchema } from "./types.js";
import { INTERPRETATION_SYSTEM_PROMPT } from "./prompts.js";

interface InterpretationResult {
  ambientes: Ambiente[];
  needs_review: ReviewItem[];
}

/**
 * Build the user prompt for interpretation, including classification context.
 */
export function buildInterpretationPrompt(page: ClassifiedPage): string {
  return `Interpret this construction drawing and extract structured data.

CLASSIFICATION:
- Type: ${page.tipo}
- Prancha: ${page.prancha}
- Pavimento: ${page.pavimento}
- Classification confidence: ${page.classification_confidence}

--- EXTRACTED TEXT ---
${page.text_content}
--- END TEXT ---

Analyze both the image and the extracted text above. Extract all rooms/environments with their dimensions, finishes, and openings. Mark uncertain items in needs_review.`;
}

/**
 * Parse the LLM interpretation response.
 */
export function parseInterpretationResponse(response: string): InterpretationResult {
  const empty: InterpretationResult = { ambientes: [], needs_review: [] };

  try {
    let jsonStr = response.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    // Validate each ambiente individually — keep valid ones, skip invalid
    const ambientes: Ambiente[] = [];
    if (Array.isArray(parsed.ambientes)) {
      for (const amb of parsed.ambientes) {
        const result = AmbienteSchema.safeParse(amb);
        if (result.success) {
          ambientes.push(result.data);
        }
      }
    }

    // Validate review items
    const needs_review: ReviewItem[] = [];
    if (Array.isArray(parsed.needs_review)) {
      for (const item of parsed.needs_review) {
        const result = ReviewItemSchema.safeParse(item);
        if (result.success) {
          needs_review.push(result.data);
        }
      }
    }

    return { ambientes, needs_review };
  } catch {
    return empty;
  }
}

/**
 * Interpret a single classified page using Claude Vision.
 * Sends both the page image and extracted text to the LLM.
 */
export async function interpretPage(
  page: ClassifiedPage,
  imagePath: string
): Promise<InterpretedPage> {
  const baseUrl = process.env.ANTHROPIC_BASE_URL ?? "http://localhost:8100";
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN ?? "";

  // Read image as base64
  const imageBuffer = await readFile(imagePath);
  const imageBase64 = imageBuffer.toString("base64");

  // Determine media type from extension
  const mediaType = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";

  const userPrompt = buildInterpretationPrompt(page);

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": authToken,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: INTERPRETATION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: userPrompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Interpretation API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as any;
  const text = data.content?.[0]?.text ?? "";
  const result = parseInterpretationResponse(text);

  return {
    ...page,
    ambientes: result.ambientes,
    needs_review: result.needs_review,
    image_path: imagePath,
  };
}

/**
 * Interpret all classified pages that have relevant types.
 * Skip cover pages, legends (unless quadro-acabamentos), and unclassifiable pages.
 */
export async function interpretAllPages(
  pages: ClassifiedPage[],
  renderedImages: Map<number, string>
): Promise<InterpretedPage[]> {
  const INTERPRETABLE_TYPES = new Set([
    "arquitetonico-planta-baixa",
    "arquitetonico-corte",
    "quadro-acabamentos",
    "quadro-areas",
  ]);

  const results: InterpretedPage[] = [];

  for (const page of pages) {
    const imagePath = renderedImages.get(page.page_number);
    if (!imagePath) continue;

    if (INTERPRETABLE_TYPES.has(page.tipo)) {
      const interpreted = await interpretPage(page, imagePath);
      results.push(interpreted);
    } else {
      // Non-interpretable pages still get stored with empty ambientes
      results.push({
        ...page,
        ambientes: [],
        needs_review: [],
        image_path: imagePath,
      });
    }
  }

  return results;
}
