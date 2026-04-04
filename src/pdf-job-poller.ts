// src/pdf-job-poller.ts
// Polls ob_pdf_jobs for pending jobs and dispatches them to the appropriate pipeline.
// Pipeline skills run inside containers — this poller just updates job status.

import { supabaseAdmin } from './supabase-client.js';

const POLL_INTERVAL_MS = 10000;

let processing = false;

/**
 * Process one pending job at a time.
 * For now, marks the job as "processing" — the actual pipeline runs inside a container.
 */
async function processNextJob(): Promise<boolean> {
  if (processing) return false;

  const { data, error } = await supabaseAdmin
    .from('ob_pdf_jobs')
    .select('id, file_id, status')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    console.error('[pdf-job-poller] Failed to fetch jobs:', error.message);
    return false;
  }

  const job = data?.[0];
  if (!job) return false;

  processing = true;
  console.log(`[pdf-job-poller] Found pending job ${job.id}`);

  try {
    // Determine file type to route to correct pipeline
    const { data: fileData } = await supabaseAdmin
      .from('ob_project_files')
      .select('file_type')
      .eq('id', job.file_id)
      .single();

    const fileType = fileData?.file_type || 'pdf';
    const pipeline =
      fileType === 'dwg' || fileType === 'dxf'
        ? 'dwg-pipeline'
        : 'pdf-pipeline';

    // Mark job as processing
    await supabaseAdmin
      .from('ob_pdf_jobs')
      .update({
        status: 'processing',
        stage: 'ingestion',
        progress: 5,
        started_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    console.log(
      `[pdf-job-poller] Job ${job.id} dispatched to ${pipeline} (file_type: ${fileType})`,
    );

    // The actual processing is handled by the /api/process endpoint
    // which is called from the frontend when the user clicks "Iniciar Orçamento"
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[pdf-job-poller] Job ${job.id} failed:`, msg);

    await supabaseAdmin
      .from('ob_pdf_jobs')
      .update({ status: 'error', error_message: msg })
      .eq('id', job.id);

    await supabaseAdmin
      .from('ob_project_files')
      .update({ status: 'error' })
      .eq('id', job.file_id);
  } finally {
    processing = false;
  }

  return true;
}

/**
 * Start the PDF/DWG job poller.
 */
export function startPdfJobPoller(): NodeJS.Timeout {
  console.log(
    `[pdf-job-poller] Poller started (interval: ${POLL_INTERVAL_MS}ms)`,
  );

  return setInterval(async () => {
    try {
      await processNextJob();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[pdf-job-poller] Poller error:', msg);
    }
  }, POLL_INTERVAL_MS);
}
