// src/pdf-job-poller.ts
// Polls ob_pdf_jobs for pending jobs and dispatches them to the appropriate pipeline.
// DWG/DXF jobs are processed by spawning the dwg-pipeline Docker container.

import { supabaseAdmin } from './supabase-client.js';
import { processDwgJob } from './dwg-processor.js';
import { processProposalJob } from './proposal-processor.js';
import { triggerOrcamentista } from './orcamentista-trigger.js';
import { logger } from './logger.js';

const POLL_INTERVAL_MS = 10000;

let processing = false;

/**
 * Process one pending job at a time.
 * DWG/DXF jobs spawn the dwg-pipeline container which handles the full extraction.
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
    logger.error(
      { error: error.message },
      '[pdf-job-poller] Failed to fetch jobs',
    );
    return false;
  }

  const job = data?.[0];
  if (!job) return false;

  processing = true;
  logger.info({ jobId: job.id }, '[pdf-job-poller] Found pending job');

  try {
    // Determine file type to route to correct pipeline
    const { data: fileData } = await supabaseAdmin
      .from('ob_project_files')
      .select('file_type, disciplina, project_id')
      .eq('id', job.file_id)
      .single();

    const fileType = fileData?.file_type || 'pdf';
    const disciplina = fileData?.disciplina || null;
    const isDwg = fileType === 'dwg' || fileType === 'dxf';
    const isProposta = disciplina === 'proposta';

    logger.info(
      {
        jobId: job.id,
        fileType,
        disciplina,
        pipeline: isProposta
          ? 'proposal-pipeline'
          : isDwg
            ? 'dwg-pipeline'
            : 'pdf-pipeline',
      },
      '[pdf-job-poller] Job dispatched',
    );

    if (isProposta) {
      const success = await processProposalJob(job.id);

      if (!success) {
        const { data: jobCheck } = await supabaseAdmin
          .from('ob_pdf_jobs')
          .select('status')
          .eq('id', job.id)
          .single();

        if (
          jobCheck &&
          jobCheck.status !== 'error' &&
          jobCheck.status !== 'done'
        ) {
          await supabaseAdmin
            .from('ob_pdf_jobs')
            .update({
              status: 'error',
              error_message: 'proposal-pipeline container failed — check logs',
            })
            .eq('id', job.id);
        }
      }
    } else if (isDwg) {
      // Spawn dwg-pipeline container — it handles all stages:
      // ingestion → conversion → extraction → classification → structured_output → done
      const success = await processDwgJob(job.id);

      if (success) {
        // Trigger orcamentista to process extracted geometry
        try {
          const { data: pages } = await supabaseAdmin
            .from('ob_pdf_pages')
            .select('structured_data, text_content, confidence')
            .eq('file_id', job.file_id)
            .order('page_number', { ascending: true });

          const extractedText = (pages || [])
            .map((p: any) => JSON.stringify(p.structured_data))
            .join('\n');

          await triggerOrcamentista({
            projectId: fileData?.project_id || '',
            runId: null,
            fileId: job.file_id,
            extractedText,
            fileInfo: `DWG pipeline: ${(pages || []).length} páginas processadas`,
            userPrompt:
              'Processar dados extraídos do DWG e criar quantitativos para todas as disciplinas encontradas.',
            pdfContext: '',
          });

          logger.info(
            { jobId: job.id },
            '[pdf-job-poller] Orcamentista triggered after DWG pipeline',
          );
        } catch (triggerErr: unknown) {
          const msg =
            triggerErr instanceof Error
              ? triggerErr.message
              : String(triggerErr);
          logger.error(
            { jobId: job.id, error: msg },
            '[pdf-job-poller] Orcamentista trigger failed',
          );
        }
      } else {
        // Container failed but may not have updated the job status
        const { data: jobCheck } = await supabaseAdmin
          .from('ob_pdf_jobs')
          .select('status')
          .eq('id', job.id)
          .single();

        if (
          jobCheck &&
          jobCheck.status !== 'error' &&
          jobCheck.status !== 'done'
        ) {
          await supabaseAdmin
            .from('ob_pdf_jobs')
            .update({
              status: 'error',
              error_message: 'dwg-pipeline container failed — check logs',
            })
            .eq('id', job.id);
        }
      }
    } else {
      // PDF pipeline: mark as processing (handled by /api/process endpoint)
      await supabaseAdmin
        .from('ob_pdf_jobs')
        .update({
          status: 'processing',
          stage: 'ingestion',
          progress: 5,
          started_at: new Date().toISOString(),
        })
        .eq('id', job.id);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ jobId: job.id, error: msg }, '[pdf-job-poller] Job failed');

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
  logger.info(
    { intervalMs: POLL_INTERVAL_MS },
    '[pdf-job-poller] Poller started',
  );

  return setInterval(async () => {
    try {
      await processNextJob();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ error: msg }, '[pdf-job-poller] Poller error');
    }
  }, POLL_INTERVAL_MS);
}
