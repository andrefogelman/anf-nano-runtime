// src/proposal-processor.ts
import { spawn } from 'child_process';
import { config } from './config.js';
import { logger } from './logger.js';
import { CONTAINER_RUNTIME_BIN, hostGatewayArgs } from './container-runtime.js';

const PROPOSAL_PIPELINE_IMAGE =
  process.env.PROPOSAL_PIPELINE_IMAGE || 'orcabot-proposal-pipeline:latest';

const PROPOSAL_PIPELINE_TIMEOUT = 300_000; // 5 minutes max

export async function processProposalJob(jobId: string): Promise<boolean> {
  const containerName = `proposal-pipeline-${jobId.slice(0, 8)}-${Date.now()}`;

  const args: string[] = [
    'run',
    '--rm',
    '--name',
    containerName,
    '-e',
    `SUPABASE_URL=${config.supabaseUrl}`,
    '-e',
    `SUPABASE_SERVICE_ROLE_KEY=${config.supabaseServiceKey}`,
    '-e',
    `GEMINI_API_KEY=${process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''}`,
    '-e',
    `GOOGLE_API_KEY=${process.env.GOOGLE_API_KEY || ''}`,
    ...hostGatewayArgs(),
    PROPOSAL_PIPELINE_IMAGE,
    'process',
    '--job-id',
    jobId,
  ];

  logger.info({ jobId, containerName }, 'Spawning proposal-pipeline container');

  return new Promise((resolve) => {
    const proc = spawn(CONTAINER_RUNTIME_BIN, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      logger.warn({ jobId }, 'proposal-pipeline timed out, killing');
      proc.kill('SIGTERM');
    }, PROPOSAL_PIPELINE_TIMEOUT);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        logger.info({ jobId }, 'proposal-pipeline completed successfully');
        resolve(true);
      } else {
        logger.error(
          { jobId, code, stderr: stderr.slice(-500) },
          'proposal-pipeline failed',
        );
        resolve(false);
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      logger.error(
        { jobId, error: err.message },
        'Failed to spawn proposal-pipeline',
      );
      resolve(false);
    });
  });
}
