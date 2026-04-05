/**
 * DWG/DXF Processor — spawns the dwg-pipeline Docker container for a job,
 * or extracts geometry from a local DXF file via the Python extractor.
 *
 * Two modes:
 * 1. processDwgJob(jobId) — full pipeline (download → extract → classify → save)
 * 2. extractDxfGeometry(buffer) — quick extraction, returns parsed JSON for LLM
 *
 * This module is called by:
 * - pdf-job-poller.ts for background job processing
 * - api-channel.ts for inline DXF extraction with geometry
 */
import { spawn } from 'child_process';
import { writeFile, mkdtemp, unlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

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
      logger.error(
        { jobId, containerName },
        'dwg-pipeline container timed out',
      );
      try {
        proc.kill('SIGTERM');
      } catch {
        /* ignore */
      }
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

// ── Inline DXF geometry extraction (for /api/process) ─────────────────────

export interface DxfExtractionResult {
  filename: string;
  units: string;
  layers: Array<{
    name: string;
    color: number;
    is_on: boolean;
    is_frozen: boolean;
    entity_counts: Record<string, number>;
  }>;
  entities: Array<{
    type: string;
    layer: string;
    vertices?: number[][];
    is_closed?: boolean;
    length?: number;
    area?: number;
    start?: number[];
    end?: number[];
    center?: number[];
    radius?: number;
  }>;
  blocks: Array<{
    name: string;
    count: number;
    layer: string;
    position: number[];
  }>;
  dimensions: Array<{
    type: string;
    actual_measurement: number;
    layer: string;
  }>;
  texts: Array<{
    type: string;
    content: string;
    layer: string;
    position: number[];
    height: number;
  }>;
  hatches: Array<{
    layer: string;
    pattern: string;
    area: number;
    vertices?: number[][];
  }>;
  stats: {
    total_layers: number;
    total_entities: number;
    total_blocks: number;
    total_dimensions: number;
    total_texts: number;
    total_hatches: number;
  };
}

const EXTRACT_TIMEOUT = 120_000; // 2 minutes

/**
 * Extract full geometry from a DXF file buffer using ezdxf via Docker.
 * Returns parsed JSON with entities, areas, lengths, etc.
 * Used by api-channel.ts for inline processing (no job/poller needed).
 */
export async function extractDxfGeometry(
  dxfBuffer: ArrayBuffer,
): Promise<DxfExtractionResult> {
  const tmpDir = await mkdtemp(join(tmpdir(), 'dxf-extract-'));
  const hostPath = join(tmpDir, 'input.dxf');

  try {
    await writeFile(hostPath, Buffer.from(dxfBuffer));

    const stdout = await new Promise<string>((resolve, reject) => {
      const args = [
        'run',
        '--rm',
        '-v',
        `${hostPath}:/tmp/input.dxf:ro`,
        '--entrypoint',
        'python3',
        DWG_PIPELINE_IMAGE,
        '/app/python/dwg_extractor.py',
        '/tmp/input.dxf',
      ];

      const proc = spawn(CONTAINER_RUNTIME_BIN, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let out = '';
      let err = '';

      proc.stdout.on('data', (d) => {
        out += d.toString();
      });
      proc.stderr.on('data', (d) => {
        err += d.toString();
      });

      const timeout = setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error('DXF extraction timed out'));
      }, EXTRACT_TIMEOUT);

      proc.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve(out);
        } else {
          reject(
            new Error(
              `DXF extraction failed (code ${code}): ${err.slice(-300)}`,
            ),
          );
        }
      });

      proc.on('error', (e) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn extraction container: ${e.message}`));
      });
    });

    return JSON.parse(stdout) as DxfExtractionResult;
  } finally {
    // Cleanup temp files
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Format extracted DXF data into a rich text summary for LLM consumption.
 * Includes geometry stats, layer details, room-like polylines, and dimensions.
 */
export function formatDxfForLlm(data: DxfExtractionResult): string {
  const parts: string[] = [];

  parts.push(`UNIDADES: ${data.units}`);
  parts.push(
    `ESTATÍSTICAS: ${data.stats.total_entities} entidades geométricas, ${data.stats.total_hatches} hatches, ${data.stats.total_texts} textos, ${data.stats.total_blocks} blocos, ${data.stats.total_dimensions} cotas, ${data.stats.total_layers} layers`,
  );

  // Layers with entity counts
  const activeLayers = data.layers.filter((l) => l.is_on && !l.is_frozen);
  parts.push(`\nLAYERS ATIVOS (${activeLayers.length}):`);
  for (const l of activeLayers) {
    const counts = Object.entries(l.entity_counts)
      .map(([t, c]) => `${t}:${c}`)
      .join(', ');
    if (counts) parts.push(`  ${l.name}: ${counts}`);
  }

  // Closed polylines with areas (room candidates)
  const closedPolys = data.entities.filter(
    (e) => e.type === 'LWPOLYLINE' && e.is_closed && e.area,
  );
  if (closedPolys.length > 0) {
    parts.push(`\nPOLILINHAS FECHADAS COM ÁREA (${closedPolys.length}):`);
    // Group by layer
    const byLayer = new Map<string, typeof closedPolys>();
    for (const p of closedPolys) {
      const arr = byLayer.get(p.layer) || [];
      arr.push(p);
      byLayer.set(p.layer, arr);
    }
    for (const [layer, polys] of byLayer) {
      const areas = polys.map((p) => p.area!).sort((a, b) => b - a);
      parts.push(
        `  ${layer}: ${polys.length} polilinhas, áreas: [${areas
          .slice(0, 20)
          .map((a) => a.toFixed(4))
          .join(', ')}]`,
      );
    }
  }

  // Hatches (filled areas — floor areas, wall sections, etc.)
  if (data.hatches && data.hatches.length > 0) {
    parts.push(`\nHATCHES/ÁREAS PREENCHIDAS (${data.hatches.length}):`);
    const hByLayer = new Map<string, typeof data.hatches>();
    for (const h of data.hatches) {
      const arr = hByLayer.get(h.layer) || [];
      arr.push(h);
      hByLayer.set(h.layer, arr);
    }
    for (const [layer, hs] of hByLayer) {
      const totalArea = hs.reduce((sum, h) => sum + h.area, 0);
      const areas = hs.map((h) => h.area).sort((a, b) => b - a);
      const patterns = [...new Set(hs.map((h) => h.pattern))].join(', ');
      parts.push(
        `  ${layer}: ${hs.length} hatches, área total=${totalArea.toFixed(4)}, padrões=[${patterns}], áreas individuais: [${areas
          .slice(0, 20)
          .map((a) => a.toFixed(4))
          .join(', ')}]`,
      );
    }
  }

  // Dimensions
  if (data.dimensions.length > 0) {
    parts.push(`\nCOTAS (${data.dimensions.length}):`);
    for (const d of data.dimensions.slice(0, 50)) {
      parts.push(
        `  [${d.layer}] ${d.type}: ${d.actual_measurement.toFixed(4)}`,
      );
    }
  }

  // Texts grouped by layer
  parts.push(`\nTEXTOS (${data.texts.length}):`);
  const textByLayer = new Map<string, string[]>();
  for (const t of data.texts) {
    const arr = textByLayer.get(t.layer) || [];
    arr.push(t.content);
    textByLayer.set(t.layer, arr);
  }
  for (const [layer, txts] of textByLayer) {
    parts.push(`  [${layer}] ${txts.slice(0, 30).join(' | ')}`);
  }

  // Blocks
  if (data.blocks.length > 0) {
    parts.push(`\nBLOCOS (${data.blocks.length}):`);
    const sorted = [...data.blocks].sort((a, b) => b.count - a.count);
    for (const b of sorted.slice(0, 50)) {
      parts.push(`  ${b.name}: ${b.count}x [${b.layer}]`);
    }
  }

  return parts.join('\n');
}
