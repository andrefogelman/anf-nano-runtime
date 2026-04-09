// container/skills/dwg-pipeline/src/index.ts
import { mkdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { tmpdir } from "node:os";
import {
  getJob,
  updateJob,
  downloadFile,
  getFileInfo,
  upsertPageResult,
  getOrgIdForProject,
} from "./supabase.js";
import { convertDwgToDxf, isDxfFile } from "./converter.js";
import { extractDxf } from "./extractor.js";
import { classifyLayers } from "./layer-classifier.js";
import { mapBlocks } from "./block-mapper.js";
import { assembleOutput } from "./structured-output.js";
import type { DwgJobStage } from "./types.js";

const STAGE_PROGRESS: Record<string, number> = {
  ingestion: 10,
  conversion: 25,
  extraction: 45,
  classification: 70,
  structured_output: 90,
  done: 100,
};

/**
 * Run the full DWG/DXF processing pipeline for a given job ID.
 */
export async function runPipeline(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (job.status !== "pending") {
    console.log(`Job ${jobId} is not pending (status: ${job.status}), skipping.`);
    return;
  }

  // Create temp working directory
  const workDir = join(tmpdir(), `dwg-pipeline-${jobId}`);
  await mkdir(workDir, { recursive: true });

  try {
    // --- Stage 1: Ingestion ---
    await updateJob(jobId, {
      status: "processing",
      stage: "ingestion" as DwgJobStage,
      progress: STAGE_PROGRESS.ingestion,
      started_at: new Date().toISOString(),
    });

    const fileInfo = await getFileInfo(job.file_id);
    const ext = extname(fileInfo.storage_path).toLowerCase();
    const localFilename = `input${ext}`;
    const localPath = join(workDir, localFilename);
    await downloadFile(fileInfo.storage_path, localPath);
    console.log(`[${jobId}] Ingestion complete: ${fileInfo.storage_path} (${fileInfo.file_type})`);

    // --- Stage 2: Conversion (DWG → DXF, skipped for DXF files) ---
    await updateJob(jobId, {
      stage: "conversion" as DwgJobStage,
      progress: STAGE_PROGRESS.conversion,
    });

    let dxfPath: string;

    if (isDxfFile(localPath)) {
      dxfPath = localPath;
      console.log(`[${jobId}] Conversion skipped: file is already DXF`);
    } else {
      const convResult = await convertDwgToDxf(localPath, workDir);
      if (!convResult.success || !convResult.dxfPath) {
        // Mark as needs_conversion — user must convert manually
        await updateJob(jobId, {
          status: "needs_conversion",
          stage: "conversion" as DwgJobStage,
          error_message: convResult.error ?? "DWG conversion failed. Please convert to DXF in AutoCAD and re-upload.",
        });
        console.log(`[${jobId}] Conversion failed: ${convResult.error}`);
        return;
      }
      dxfPath = convResult.dxfPath;
      console.log(`[${jobId}] Conversion complete: ${dxfPath}`);
    }

    // --- Stage 3: Extraction ---
    await updateJob(jobId, {
      stage: "extraction" as DwgJobStage,
      progress: STAGE_PROGRESS.extraction,
    });

    const extractedData = await extractDxf(dxfPath);
    console.log(
      `[${jobId}] Extraction complete: ${extractedData.stats.total_layers} layers, ` +
        `${extractedData.stats.total_entities} entities, ${extractedData.stats.total_blocks} blocks`
    );

    // --- Stage 4: Classification ---
    await updateJob(jobId, {
      stage: "classification" as DwgJobStage,
      progress: STAGE_PROGRESS.classification,
    });

    const orgId = await getOrgIdForProject(fileInfo.project_id);

    const classifiedLayers = await classifyLayers(
      extractedData.layers,
      extractedData.entities,
      extractedData.blocks,
      extractedData.texts,
      orgId
    );
    console.log(`[${jobId}] Classification complete: ${classifiedLayers.length} layers classified`);

    const mappedBlocks = await mapBlocks(extractedData.blocks, orgId);
    console.log(`[${jobId}] Block mapping complete: ${mappedBlocks.length} blocks mapped`);

    // --- Stage 5: Structured Output ---
    await updateJob(jobId, {
      stage: "structured_output" as DwgJobStage,
      progress: STAGE_PROGRESS.structured_output,
    });

    const output = await assembleOutput(extractedData, classifiedLayers, mappedBlocks);

    // Compute overall confidence (min of all ambiente confidences, or 0.5 if no ambientes)
    const confidence =
      output.ambientes.length > 0
        ? Math.min(...output.ambientes.map((a) => a.confidence))
        : 0.5;

    // Persist result to ob_pdf_pages
    await upsertPageResult(job.file_id, 1, {
      prancha_id: output.prancha,
      tipo: output.tipo,
      text_content: extractedData.texts.map((t) => t.content).join("\n"),
      ocr_used: false,
      image_path: "",
      structured_data: output as unknown as Record<string, unknown>,
      confidence,
      needs_review: output.needs_review.length > 0,
      review_notes:
        output.needs_review.length > 0
          ? `Blocos nao reconhecidos: ${output.needs_review.join(", ")}`
          : null,
    });

    // Persist ambientes as ob_quantitativos
    if (output.ambientes.length > 0) {
      const { getSupabase } = await import("./supabase.js");
      const sb = getSupabase();
      const tipoToDisc: Record<string, string> = {
        "arquitetonico-planta-baixa": "arq", "arquitetonico-corte": "arq",
        "arquitetonico-fachada": "arq", "arquitetonico-cobertura": "arq",
        "estrutural-forma": "est", "estrutural-armacao": "est",
        "hidraulico-agua-fria": "hid", "hidraulico-esgoto": "hid",
        "eletrico-pontos": "ele", "eletrico-caminhamento": "ele",
      };
      const disc = tipoToDisc[output.tipo] || "geral";
      const rows = output.ambientes.map((amb, idx) => ({
        project_id: fileInfo.project_id,
        disciplina: disc,
        item_code: String(idx + 1).padStart(3, "0"),
        descricao: `${amb.nome} — ${amb.acabamentos?.piso || "piso"}`,
        unidade: "m²",
        quantidade: amb.area_m2,
        calculo_memorial: `Área: ${amb.area_m2} m², Perímetro: ${amb.perimetro_m} m, Pé-direito: ${amb.pe_direito_m} m`,
        origem_ambiente: amb.nome,
        confidence: amb.confidence,
        needs_review: amb.confidence < 0.7,
        created_by: "dwg-pipeline",
      }));
      const { error: qErr } = await sb.from("ob_quantitativos").insert(rows);
      if (qErr) console.error(`[${jobId}] Failed to insert quantitativos:`, qErr.message);
      else console.log(`[${jobId}] Inserted ${rows.length} quantitativos`);
    }

    // --- Done ---
    await updateJob(jobId, {
      status: "done",
      stage: "done" as DwgJobStage,
      progress: 100,
      completed_at: new Date().toISOString(),
    });

    console.log(
      `[${jobId}] Pipeline complete: ${output.ambientes.length} ambientes, ` +
        `${output.blocos.length} blocos, ${output.tubulacoes.length} tubulacoes`
    );
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

// CLI entry point: `dwg-pipeline process --job-id <uuid>`
const args = process.argv.slice(2);
if (args[0] === "process" && args[1] === "--job-id" && args[2]) {
  runPipeline(args[2]).catch((err) => {
    console.error("Fatal pipeline error:", err);
    process.exit(1);
  });
}
