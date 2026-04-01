// container/skills/pdf-pipeline/src/index.ts
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  getJob,
  updateJob,
  downloadPdf,
  getFileStoragePath,
  uploadPageImage,
  upsertPageResult,
  getSupabase,
} from "./supabase.js";
import { extractAllPages } from "./extraction.js";
import { renderPdfPages } from "./renderer.js";
import { classifyAllPages } from "./classification.js";
import { interpretAllPages } from "./interpretation.js";
import { assembleAllOutputs } from "./structured-output.js";
import { computePageConfidence } from "./confidence.js";
import type { JobStage } from "./types.js";

const STAGE_PROGRESS: Record<string, number> = {
  ingestion: 10,
  extraction: 30,
  classification: 50,
  interpretation: 70,
  structured_output: 90,
  done: 100,
};

/**
 * Run the full PDF processing pipeline for a given job ID.
 */
export async function runPipeline(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (job.status !== "pending") {
    console.log(`Job ${jobId} is not pending (status: ${job.status}), skipping.`);
    return;
  }

  // Create temp working directory
  const workDir = join(tmpdir(), `pdf-pipeline-${jobId}`);
  await mkdir(workDir, { recursive: true });

  try {
    // --- Stage 1: Ingestion ---
    await updateJob(jobId, {
      status: "processing",
      stage: "ingestion" as JobStage,
      progress: STAGE_PROGRESS.ingestion,
      started_at: new Date().toISOString(),
    });

    const storagePath = await getFileStoragePath(job.file_id);
    const pdfPath = join(workDir, "input.pdf");
    await downloadPdf(storagePath, pdfPath);
    console.log(`[${jobId}] Ingestion complete: ${storagePath}`);

    // --- Stage 2: Extraction ---
    await updateJob(jobId, {
      stage: "extraction" as JobStage,
      progress: STAGE_PROGRESS.extraction,
    });

    const extractedPages = await extractAllPages(pdfPath, workDir);
    console.log(`[${jobId}] Extraction complete: ${extractedPages.length} pages`);

    // Render all pages to images (needed for Vision + OCR pages)
    const renderedPages = await renderPdfPages(pdfPath, workDir);
    const imageMap = new Map(
      renderedPages.map((r) => [r.page_number, r.image_path])
    );

    // --- Stage 3: Classification ---
    await updateJob(jobId, {
      stage: "classification" as JobStage,
      progress: STAGE_PROGRESS.classification,
    });

    const classifiedPages = await classifyAllPages(extractedPages);
    console.log(`[${jobId}] Classification complete`);

    // --- Stage 4: Interpretation ---
    await updateJob(jobId, {
      stage: "interpretation" as JobStage,
      progress: STAGE_PROGRESS.interpretation,
    });

    const interpretedPages = await interpretAllPages(classifiedPages, imageMap);
    console.log(`[${jobId}] Interpretation complete`);

    // --- Stage 5: Structured Output ---
    await updateJob(jobId, {
      stage: "structured_output" as JobStage,
      progress: STAGE_PROGRESS.structured_output,
    });

    const outputs = assembleAllOutputs(interpretedPages);

    // Persist results to Supabase
    const sb = getSupabase();
    const { data: fileData } = await sb
      .from("project_files")
      .select("project_id")
      .eq("id", job.file_id)
      .single();
    const projectId = fileData?.project_id ?? "unknown";

    for (const output of outputs) {
      const imagePath = imageMap.get(output.page_number);
      let uploadedImagePath = "";

      if (imagePath) {
        const { readFile } = await import("node:fs/promises");
        const imageBuffer = await readFile(imagePath);
        uploadedImagePath = await uploadPageImage(
          projectId,
          job.file_id,
          output.page_number,
          imageBuffer
        );
      }

      const confidence = computePageConfidence(output.ambientes);

      await upsertPageResult(job.file_id, output.page_number, {
        prancha_id: output.prancha,
        tipo: output.tipo,
        text_content:
          interpretedPages.find((p) => p.page_number === output.page_number)
            ?.text_content ?? "",
        ocr_used:
          interpretedPages.find((p) => p.page_number === output.page_number)
            ?.ocr_used ?? false,
        image_path: uploadedImagePath,
        structured_data: output as unknown as Record<string, unknown>,
        confidence,
        needs_review: output.needs_review.length > 0,
        review_notes:
          output.needs_review.length > 0
            ? output.needs_review.map((r) => `${r.ambiente}: ${r.motivo}`).join("; ")
            : null,
      });
    }

    // --- Done ---
    await updateJob(jobId, {
      status: "done",
      stage: "done" as JobStage,
      progress: 100,
      completed_at: new Date().toISOString(),
    });

    console.log(`[${jobId}] Pipeline complete: ${outputs.length} pages processed`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${jobId}] Pipeline error:`, message);
    await updateJob(jobId, {
      status: "error",
      error_message: message.slice(0, 1000),
    });
    throw error;
  }
}

// CLI entry point: `pdf-pipeline process --job-id <uuid>`
const args = process.argv.slice(2);
if (args[0] === "process" && args[1] === "--job-id" && args[2]) {
  runPipeline(args[2]).catch((err) => {
    console.error("Fatal pipeline error:", err);
    process.exit(1);
  });
}
