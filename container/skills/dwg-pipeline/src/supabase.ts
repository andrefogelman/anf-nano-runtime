// container/skills/dwg-pipeline/src/supabase.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DwgJob, DwgJobStage, BlockMapping, LayerMapping } from "./types.js";

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

/** Allow injecting an existing Supabase client (used in tests or in-process) */
export function setSupabase(sb: SupabaseClient): void {
  client = sb;
}

// ── Job tracking (reuses ob_pdf_jobs table) ──────────────────────────────────

/** Fetch a pending job by ID */
export async function getJob(jobId: string): Promise<DwgJob> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("ob_pdf_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  if (error) throw new Error(`Failed to fetch job ${jobId}: ${error.message}`);
  return data as DwgJob;
}

/** Update job status, stage, and progress */
export async function updateJob(
  jobId: string,
  updates: Partial<Pick<DwgJob, "status" | "stage" | "progress" | "error_message" | "started_at" | "completed_at">>
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("ob_pdf_jobs").update(updates).eq("id", jobId);
  if (error) throw new Error(`Failed to update job ${jobId}: ${error.message}`);
}

// ── File operations ──────────────────────────────────────────────────────────

/** Get the storage_path and file_type for a project file */
export async function getFileInfo(fileId: string): Promise<{ storage_path: string; file_type: string; project_id: string }> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("ob_project_files")
    .select("storage_path, file_type, project_id")
    .eq("id", fileId)
    .single();
  if (error) throw new Error(`Failed to fetch file ${fileId}: ${error.message}`);
  return data;
}

/** Download a file from Supabase Storage to a local path */
export async function downloadFile(storagePath: string, localPath: string): Promise<void> {
  const sb = getSupabase();
  const { data, error } = await sb.storage
    .from("project-pdfs")
    .download(storagePath);
  if (error) throw new Error(`Failed to download ${storagePath}: ${error.message}`);

  const buffer = Buffer.from(await data.arrayBuffer());
  const { writeFile } = await import("node:fs/promises");
  await writeFile(localPath, buffer);
}

/** Upsert a page result into ob_pdf_pages */
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

// ── Block Mappings ───────────────────────────────────────────────────────────

/** Get all block mappings for an organization */
export async function getBlockMappings(orgId: string): Promise<BlockMapping[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("ob_block_mappings")
    .select("*")
    .eq("org_id", orgId);
  if (error) throw new Error(`Failed to fetch block mappings: ${error.message}`);
  return data as BlockMapping[];
}

/** Save a block mapping (upsert by org_id + block_name) */
export async function saveBlockMapping(orgId: string, mapping: Omit<BlockMapping, "id" | "org_id">): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("ob_block_mappings").upsert(
    {
      org_id: orgId,
      block_name: mapping.block_name,
      componente: mapping.componente,
      disciplina: mapping.disciplina,
      unidade: mapping.unidade,
      confirmed: mapping.confirmed,
    },
    { onConflict: "org_id,block_name" }
  );
  if (error) throw new Error(`Failed to save block mapping: ${error.message}`);
}

// ── Layer Mappings ───────────────────────────────────────────────────────────

/** Get all layer mappings for an organization */
export async function getLayerMappings(orgId: string): Promise<LayerMapping[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("ob_layer_mappings")
    .select("*")
    .eq("org_id", orgId);
  if (error) throw new Error(`Failed to fetch layer mappings: ${error.message}`);
  return data as LayerMapping[];
}

/** Save a layer mapping (upsert by org_id + layer_name) */
export async function saveLayerMapping(orgId: string, mapping: Omit<LayerMapping, "id" | "org_id">): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("ob_layer_mappings").upsert(
    {
      org_id: orgId,
      layer_name: mapping.layer_name,
      disciplina: mapping.disciplina,
      confirmed: mapping.confirmed,
    },
    { onConflict: "org_id,layer_name" }
  );
  if (error) throw new Error(`Failed to save layer mapping: ${error.message}`);
}

/** Get the org_id for a project */
export async function getOrgIdForProject(projectId: string): Promise<string> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("ob_projects")
    .select("org_id")
    .eq("id", projectId)
    .single();
  if (error) throw new Error(`Failed to fetch project ${projectId}: ${error.message}`);
  return data.org_id;
}
