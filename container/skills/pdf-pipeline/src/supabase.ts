// container/skills/pdf-pipeline/src/supabase.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PdfJob } from "./types.js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  client = createClient(url, key);
  return client;
}

/** Allow injecting an existing Supabase client (used when running in-process) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setSupabase(sb: any): void {
  client = sb as SupabaseClient;
}

/** Fetch a pending job by ID */
export async function getJob(jobId: string): Promise<PdfJob> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("ob_pdf_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  if (error) throw new Error(`Failed to fetch job ${jobId}: ${error.message}`);
  return data as PdfJob;
}

/** Update job status, stage, and progress */
export async function updateJob(
  jobId: string,
  updates: Partial<Pick<PdfJob, "status" | "stage" | "progress" | "error_message" | "started_at" | "completed_at">>
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("ob_pdf_jobs").update(updates).eq("id", jobId);
  if (error) throw new Error(`Failed to update job ${jobId}: ${error.message}`);
}

/** Download a PDF from Supabase Storage to a local path */
export async function downloadPdf(storagePath: string, localPath: string): Promise<void> {
  const sb = getSupabase();
  const { data, error } = await sb.storage
    .from("project-pdfs")
    .download(storagePath);
  if (error) throw new Error(`Failed to download ${storagePath}: ${error.message}`);

  const buffer = Buffer.from(await data.arrayBuffer());
  const { writeFile } = await import("node:fs/promises");
  await writeFile(localPath, buffer);
}

/** Get the storage_path for a project file */
export async function getFileStoragePath(fileId: string): Promise<string> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("ob_project_files")
    .select("storage_path")
    .eq("id", fileId)
    .single();
  if (error) throw new Error(`Failed to fetch file ${fileId}: ${error.message}`);
  return data.storage_path;
}

/** Upload a rendered page image to Storage */
export async function uploadPageImage(
  projectId: string,
  fileId: string,
  pageNumber: number,
  imageBuffer: Buffer
): Promise<string> {
  const sb = getSupabase();
  const path = `renders/${projectId}/${fileId}/page-${pageNumber}.png`;
  const { error } = await sb.storage
    .from("project-pdfs")
    .upload(path, imageBuffer, {
      contentType: "image/png",
      upsert: true,
    });
  if (error) throw new Error(`Failed to upload page image: ${error.message}`);
  return path;
}

/** Upsert a pdf_pages row with structured data */
export async function upsertPageResult(
  fileId: string,
  pageNumber: number,
  data: {
    prancha_id: string;
    tipo: string;
    text_content: string;
    ocr_used: boolean;
    image_path: string;
    structured_data: Record<string, unknown>;
    confidence: number;
    needs_review: boolean;
    review_notes: string | null;
  }
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("ob_pdf_pages").upsert(
    {
      file_id: fileId,
      page_number: pageNumber,
      ...data,
    },
    { onConflict: "file_id,page_number" }
  );
  if (error) throw new Error(`Failed to upsert page result: ${error.message}`);
}
