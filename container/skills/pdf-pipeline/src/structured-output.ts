// container/skills/pdf-pipeline/src/structured-output.ts
import type { InterpretedPage, PageOutput } from "./types.js";
import { PageOutputSchema } from "./types.js";
import { computePageConfidence, flagLowConfidenceItems } from "./confidence.js";

/**
 * Assemble and validate the final structured output for a single page.
 * Merges LLM-generated needs_review with confidence-based flags.
 * Validates against the Zod schema.
 */
export function assemblePageOutput(page: InterpretedPage): PageOutput {
  // Flag low-confidence items not already in needs_review
  const additionalFlags = flagLowConfidenceItems(page.ambientes, page.needs_review);
  const allReviews = [...page.needs_review, ...additionalFlags];

  const output: PageOutput = {
    prancha: page.prancha,
    tipo: page.tipo,
    pavimento: page.pavimento,
    page_number: page.page_number,
    ambientes: page.ambientes,
    needs_review: allReviews,
  };

  // Validate against schema — throw if invalid
  const result = PageOutputSchema.safeParse(output);
  if (!result.success) {
    console.error("Schema validation failed:", result.error.issues);
    // Return a minimal valid output rather than throwing
    return {
      prancha: page.prancha,
      tipo: page.tipo,
      pavimento: page.pavimento,
      page_number: page.page_number,
      ambientes: [],
      needs_review: [
        {
          ambiente: "PIPELINE",
          campo: "schema_validation",
          motivo: `Validacao falhou: ${result.error.issues.map((i) => i.message).join("; ")}`,
          confidence: 0,
        },
      ],
    };
  }

  return result.data;
}

/**
 * Assemble all page outputs.
 */
export function assembleAllOutputs(pages: InterpretedPage[]): PageOutput[] {
  return pages.map(assemblePageOutput);
}
