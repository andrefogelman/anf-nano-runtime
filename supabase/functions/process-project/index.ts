// supabase/functions/process-project/index.ts
// Edge Function: processes all pending PDF jobs for a project, then runs orcamentista.
// Called by the frontend "Iniciar Orçamento" button.

import { createClient } from "npm:@supabase/supabase-js@2";
import { getDocument, GlobalWorkerOptions } from "npm:pdfjs-dist@4.10.38/legacy/build/pdf.mjs";

// Disable worker (runs in main thread in Deno)
GlobalWorkerOptions.workerSrc = "";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LLM_BASE_URL = Deno.env.get("ANTHROPIC_BASE_URL") || "http://100.91.255.19:8100";
const LLM_AUTH_TOKEN = Deno.env.get("ANTHROPIC_AUTH_TOKEN") || "sk-proxy-passthrough";
const LLM_MODEL = Deno.env.get("LLM_MODEL") || "claude-haiku-4-5-20251001";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CLASSIFICATION_SYSTEM_PROMPT = `You are a construction drawing classifier for Brazilian civil construction projects.

Given the text content extracted from a PDF page, classify it into one of these types:

ARCHITECTURAL:
- arquitetonico-planta-baixa — floor plan showing rooms, dimensions, walls
- arquitetonico-corte — cross-section showing vertical dimensions
- arquitetonico-fachada — facade/elevation
- arquitetonico-cobertura — roof plan
- arquitetonico-situacao — site plan

STRUCTURAL:
- estrutural-forma — formwork plan
- estrutural-armacao — reinforcement detail
- estrutural-detalhe — structural details

HYDRAULIC:
- hidraulico-agua-fria — cold water plumbing
- hidraulico-esgoto — sewage/drainage
- hidraulico-pluvial — rainwater drainage

ELECTRICAL:
- eletrico-pontos — electrical points
- eletrico-caminhamento — conduit routing
- eletrico-unifilar — single-line diagram

OTHER:
- legenda — legend/symbol key
- memorial — descriptive memorial
- quadro-areas — area table
- quadro-acabamentos — finishes schedule
- capa — cover page
- outro — cannot determine

Respond with ONLY a JSON object:
{"tipo": "<type>", "prancha": "<ID or UNKNOWN>", "pavimento": "<floor or indefinido>", "confidence": <0.0-1.0>}`;

const INTERPRETATION_SYSTEM_PROMPT = `You are a construction drawing interpreter for Brazilian civil construction projects.
Extract structured data from the text. For floor plans, extract rooms with area, perimeter, ceiling height, finishes, and openings.
For other types, extract what you can. Respond with ONLY a JSON object:
{
  "ambientes": [{"nome":"string","area_m2":number,"perimetro_m":number,"pe_direito_m":number,"acabamentos":{"piso":"string","parede":"string","forro":"string"},"aberturas":[{"tipo":"porta|janela","dim":"WxH","qtd":number}],"confidence":number}],
  "needs_review": [{"ambiente":"string","campo":"string","motivo":"string","confidence":number}]
}`;

// --- Helpers ---

async function callClaude(system: string, userContent: string): Promise<string> {
  const MAX_RETRIES = 3;
  const DELAYS = [10_000, 30_000, 60_000];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(`${LLM_BASE_URL}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": LLM_AUTH_TOKEN,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (res.status === 429 && attempt < MAX_RETRIES) {
      console.log(`Rate limited, retrying in ${DELAYS[attempt] / 1000}s...`);
      await new Promise((r) => setTimeout(r, DELAYS[attempt]));
      continue;
    }

    if (!res.ok) {
      throw new Error(`Claude API error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text ?? "";
  }
  throw new Error("Max retries exceeded");
}

function parseJson(text: string): Record<string, unknown> {
  // Try raw JSON first, then extract from markdown
  try { return JSON.parse(text); } catch { /* ignore */ }
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    try { return JSON.parse(match[1]); } catch { /* ignore */ }
  }
  return {};
}

async function extractTextFromPdf(pdfBuffer: ArrayBuffer): Promise<Array<{ page: number; text: string }>> {
  const doc = await getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
  const pages: Array<{ page: number; text: string }> = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item: any) => "str" in item)
      .map((item: any) => item.str)
      .join(" ");
    pages.push({ page: i, text });
    page.cleanup();
  }
  doc.destroy();
  return pages;
}

// --- Main Pipeline ---

async function processJob(jobId: string, fileId: string): Promise<void> {
  // Update job status
  await supabase.from("ob_pdf_jobs").update({
    status: "processing", stage: "ingestion", progress: 10,
    started_at: new Date().toISOString(),
  }).eq("id", jobId);

  // Get file info
  const { data: fileData } = await supabase
    .from("ob_project_files")
    .select("storage_path, project_id")
    .eq("id", fileId)
    .single();
  if (!fileData) throw new Error(`File ${fileId} not found`);

  // Download PDF
  const { data: pdfBlob, error: dlErr } = await supabase.storage
    .from("project-pdfs")
    .download(fileData.storage_path);
  if (dlErr || !pdfBlob) throw new Error(`Download failed: ${dlErr?.message}`);

  // Extract text
  await supabase.from("ob_pdf_jobs").update({ stage: "extraction", progress: 30 }).eq("id", jobId);
  const pdfBuffer = await pdfBlob.arrayBuffer();
  const pages = await extractTextFromPdf(pdfBuffer);
  console.log(`[${jobId}] Extracted ${pages.length} pages`);

  // Process each page
  for (const { page, text } of pages) {
    // Classify
    await supabase.from("ob_pdf_jobs").update({ stage: "classification", progress: 50 }).eq("id", jobId);
    const classPrompt = `Page ${page}, ${text.length} chars:\n---\n${text.slice(0, 3000)}\n---`;
    const classResult = parseJson(await callClaude(CLASSIFICATION_SYSTEM_PROMPT, classPrompt));
    const tipo = (classResult.tipo as string) || "outro";
    const prancha = (classResult.prancha as string) || "UNKNOWN";
    console.log(`[${jobId}] Page ${page}: ${tipo} (${prancha})`);

    // Interpret
    await supabase.from("ob_pdf_jobs").update({ stage: "interpretation", progress: 70 }).eq("id", jobId);
    const interpPrompt = `Type: ${tipo}, Prancha: ${prancha}\nText:\n${text.slice(0, 4000)}`;
    const interpResult = parseJson(await callClaude(INTERPRETATION_SYSTEM_PROMPT, interpPrompt));
    const ambientes = (interpResult.ambientes as unknown[]) || [];
    const needsReview = (interpResult.needs_review as unknown[]) || [];

    // Compute confidence
    const confidence = ambientes.length > 0
      ? (ambientes as Array<{ confidence?: number }>).reduce((s, a) => s + (a.confidence ?? 0.5), 0) / ambientes.length
      : 0.5;

    // Save to db
    await supabase.from("ob_pdf_pages").upsert({
      file_id: fileId,
      page_number: page,
      prancha_id: prancha,
      tipo,
      text_content: text,
      ocr_used: false,
      image_path: "",
      structured_data: interpResult,
      confidence,
      needs_review: needsReview.length > 0,
      review_notes: needsReview.length > 0
        ? (needsReview as Array<{ ambiente?: string; motivo?: string }>)
            .map((r) => `${r.ambiente}: ${r.motivo}`).join("; ")
        : null,
    }, { onConflict: "file_id,page_number" });
  }

  // Done
  await supabase.from("ob_pdf_jobs").update({
    status: "done", stage: "done", progress: 100,
    completed_at: new Date().toISOString(),
  }).eq("id", jobId);

  await supabase.from("ob_project_files").update({ status: "done" }).eq("id", fileId);
  console.log(`[${jobId}] Complete`);
}

// --- Edge Function Handler ---

Deno.serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id required" }), { status: 400 });
    }

    // Get all pending jobs for this project
    const { data: jobs } = await supabase
      .from("ob_pdf_jobs")
      .select("id, file_id, status, ob_project_files!inner(project_id)")
      .eq("ob_project_files.project_id", project_id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    const pendingJobs = jobs || [];
    console.log(`Processing ${pendingJobs.length} pending jobs for project ${project_id}`);

    // Update project status
    await supabase.from("ob_projects").update({ status: "processing" }).eq("id", project_id);

    // Process each job sequentially
    let processed = 0;
    let failed = 0;

    for (const job of pendingJobs) {
      try {
        await processJob(job.id, job.file_id);
        processed++;
      } catch (err) {
        console.error(`Job ${job.id} failed:`, err);
        await supabase.from("ob_pdf_jobs").update({
          status: "error",
          error_message: (err as Error).message?.slice(0, 1000),
        }).eq("id", job.id);
        await supabase.from("ob_project_files").update({ status: "error" }).eq("id", job.file_id);
        failed++;
      }
    }

    // Update project status
    const finalStatus = failed === pendingJobs.length ? "review" : "review";
    await supabase.from("ob_projects").update({ status: finalStatus }).eq("id", project_id);

    return new Response(JSON.stringify({
      success: true,
      processed,
      failed,
      total: pendingJobs.length,
      message: `Processamento concluído: ${processed} PDFs processados, ${failed} com erro`,
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({
      error: (err as Error).message,
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
