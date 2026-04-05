/**
 * DWG/DXF Processor — spawns the dwg-pipeline Docker container for a job.
 *
 * The container handles: download from Supabase Storage → ezdxf extraction →
 * layer classification → block mapping → structured output → save to ob_pdf_pages.
 *
 * This module is called by pdf-job-poller.ts when a DXF/DWG job is found.
 */
import { spawn } from 'child_process';

import { config } from './config.js';
import { logger } from './logger.js';
import { CONTAINER_RUNTIME_BIN, hostGatewayArgs } from './container-runtime.js';

const DWG_PIPELINE_IMAGE =
  process.env.DWG_PIPELINE_IMAGE || 'orcabot-dwg-pipeline:latest';

const DWG_PIPELINE_TIMEOUT = 300_000; // 5 minutes max

/**
 * Run the dwg-pipeline container for a given job ID.
 * Returns true on success, false on failure (job status is updated by the container).
 */
export async function processDwgJob(jobId: string): Promise<boolean> {
  const containerName = `dwg-pipeline-${jobId.slice(0, 8)}-${Date.now()}`;

  const args: string[] = [
    'run',
    '--rm',
    '--name',
    containerName,
    // Pass Supabase credentials so the container can access storage and DB
    '-e',
    `SUPABASE_URL=${config.supabaseUrl}`,
    '-e',
    `SUPABASE_SERVICE_ROLE_KEY=${config.supabaseServiceKey}`,
    // LLM proxy for layer/block classification (optional, degrades gracefully)
    '-e',
    `ANTHROPIC_BASE_URL=http://host.docker.internal:${config.llmProxyPort}`,
    '-e',
    `ANTHROPIC_AUTH_TOKEN=${config.anthropicApiKey}`,
    // Host gateway for Docker networking
    ...hostGatewayArgs(),
    // Image + command
    DWG_PIPELINE_IMAGE,
    'process',
    '--job-id',
    jobId,
  ];

  logger.info({ jobId, containerName }, 'Spawning dwg-pipeline container');

  return new Promise((resolve) => {
    const proc = spawn(CONTAINER_RUNTIME_BIN, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      // Log pipeline progress lines
      for (const line of chunk.trim().split('\n')) {
        if (line) logger.debug({ jobId }, `[dwg-pipeline] ${line}`);
      }
    });

    proc.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      for (const line of chunk.trim().split('\n')) {
        if (line) logger.warn({ jobId }, `[dwg-pipeline:err] ${line}`);
      }
    });

    const timeout = setTimeout(() => {
      logger.error({ jobId, containerName }, 'dwg-pipeline container timed out');
      try {
        proc.kill('SIGTERM');
      } catch { /* ignore */ }
      resolve(false);
    }, DWG_PIPELINE_TIMEOUT);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        logger.info({ jobId }, 'dwg-pipeline completed successfully');
        resolve(true);
      } else {
        logger.error(
          { jobId, code, stderr: stderr.slice(-500) },
          'dwg-pipeline failed',
        );
        resolve(false);
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      logger.error(
        { jobId, error: err.message },
        'Failed to spawn dwg-pipeline container',
      );
      resolve(false);
    });
  });
}
