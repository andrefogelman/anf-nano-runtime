// src/pdf-job-poller.ts
// Polls ob_pdf_jobs for pending jobs and runs the PDF pipeline sequentially.

import { supabase } from './supabase-client.js';
import { setSupabase } from '../container/skills/pdf-pipeline/src/supabase.js';
import { runPipeline } from '../container/skills/pdf-pipeline/src/index.js';

const POLL_INTERVAL_MS = 10000;
const COOLDOWN_BETWEEN_JOBS_MS = 5000;

let processing = false;

/**
 * Process one pending job at a time (sequential to avoid rate limits).
 */
async function processNextJob(): Promise<boolean> {
  if (processing) return false;

  const { data, error } = await supabase
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
  setSupabase(supabase);

  console.log(`[pdf-job-poller] Starting pipeline for job ${job.id}`);

  try {
    await runPipeline(job.id);
    console.log(`[pdf-job-poller] Job ${job.id} completed successfully`);

    // Update file status to done
    await supabase
      .from('ob_project_files')
      .update({ status: 'done' })
      .eq('id', job.file_id);
  } catch (err: any) {
    console.error(`[pdf-job-poller] Job ${job.id} failed:`, err.message);

    // Update file status to error
    await supabase
      .from('ob_project_files')
      .update({ status: 'error' })
      .eq('id', job.file_id);
  } finally {
    processing = false;
  }

  // Cooldown between jobs to avoid rate limits
  await new Promise((r) => setTimeout(r, COOLDOWN_BETWEEN_JOBS_MS));
  return true;
}

/**
 * Start the PDF job poller. Runs every POLL_INTERVAL_MS.
 */
export function startPdfJobPoller(): NodeJS.Timeout {
  console.log(
    `[pdf-job-poller] Poller started (interval: ${POLL_INTERVAL_MS}ms, sequential mode)`,
  );

  return setInterval(async () => {
    try {
      const processed = await processNextJob();
      if (processed) {
        console.log('[pdf-job-poller] Job processed, checking for more...');
      }
    } catch (err: any) {
      console.error('[pdf-job-poller] Poller error:', err.message);
    }
  }, POLL_INTERVAL_MS);
}
