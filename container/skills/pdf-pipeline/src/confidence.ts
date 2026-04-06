// container/skills/pdf-pipeline/src/confidence.ts
import { CONFIDENCE_THRESHOLD, type Ambiente, type ReviewItem } from "./types.js";

/**
 * Compute overall page confidence as the minimum of ambiente confidences.
 */
export function computePageConfidence(ambientes: Ambiente[]): number {
  if (ambientes.length === 0) return 0;
  return Math.min(...ambientes.map((amb) => amb.confidence));
}

/**
 * Flag ambientes below the confidence threshold that are not already in needs_review.
 * Returns only the NEW review items to add.
 */
export function flagLowConfidenceItems(
  ambientes: Ambiente[],
  existingReviews: ReviewItem[]
): ReviewItem[] {
  const existingSet = new Set(existingReviews.map((r) => r.ambiente));
  const newFlags: ReviewItem[] = [];

  for (const amb of ambientes) {
    if (amb.confidence < CONFIDENCE_THRESHOLD && !existingSet.has(amb.nome)) {
      newFlags.push({
        ambiente: amb.nome,
        campo: "geral",
        motivo: `Confianca geral abaixo de ${(CONFIDENCE_THRESHOLD * 100).toFixed(0)}% — revisar dados extraidos`,
        confidence: amb.confidence,
      });
    }
  }

  return newFlags;
}
