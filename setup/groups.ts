/**
 * Step: groups — Fetch group metadata from messaging platforms, write to DB.
 * WhatsApp requires an upfront sync (Baileys groupFetchAllParticipating).
 * Other channels discover group names at runtime — this step auto-skips for them.
 * Replaces 05-sync-groups.sh + 05b-list-groups.sh
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { supabaseAdmin } from '../src/supabase-client.js';
import { logger } from '../src/logger.js';
import { emitStatus } from './status.js';

function parseArgs(args: string[]): { list: boolean; limit: number } {
  let list = false;
  let limit = 30;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--list') list = true;
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    }
  }
  return { list, limit };
}

export async function run(args: string[]): Promise<void> {
  const projectRoot = process.cwd();
  const { list, limit } = parseArgs(args);

  if (list) {
    await listGroups(limit);
    return;
  }

  await syncGroups(projectRoot);
}

async function listGroups(limit: number): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('ob_nc_chats')
    .select('jid, name')
    .like('jid', '%@g.us')
    .neq('jid', '__group_sync__')
    .order('last_message_time', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('ERROR: failed to query groups');
    process.exit(1);
  }

  // Filter out rows where name equals jid
  for (const row of data || []) {
    if (row.name && row.name !== row.jid) {
      console.log(`${row.jid}|${row.name}`);
    }
  }
}

async function syncGroups(projectRoot: string): Promise<void> {
  // Only WhatsApp needs an upfront group sync; other channels resolve names at runtime.
  // Detect WhatsApp by checking for auth credentials on disk.
  const authDir = path.join(projectRoot, 'store', 'auth');
  const hasWhatsAppAuth =
    fs.existsSync(authDir) && fs.readdirSync(authDir).length > 0;

  if (!hasWhatsAppAuth) {
    logger.info('WhatsApp auth not found — skipping group sync');
    emitStatus('SYNC_GROUPS', {
      BUILD: 'skipped',
      SYNC: 'skipped',
      GROUPS_IN_DB: 0,
      REASON: 'whatsapp_not_configured',
      STATUS: 'success',
      LOG: 'logs/setup.log',
    });
    return;
  }

  // Build TypeScript first
  logger.info('Building TypeScript');
  let buildOk = false;
  try {
    execSync('npm run build', {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    buildOk = true;
    logger.info('Build succeeded');
  } catch {
    logger.error('Build failed');
    emitStatus('SYNC_GROUPS', {
      BUILD: 'failed',
      SYNC: 'skipped',
      GROUPS_IN_DB: 0,
      STATUS: 'failed',
      ERROR: 'build_failed',
      LOG: 'logs/setup.log',
    });
    process.exit(1);
  }

  // Run sync script via a temp file to avoid shell escaping issues with node -e
  // This script uses Supabase directly for DB writes
  logger.info('Fetching group metadata');
  let syncOk = false;
  try {
    const syncScript = `
import makeWASocket, { useMultiFileAuthState, makeCacheableSignalKeyStore, Browsers } from '@whiskeysockets/baileys';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const logger = pino({ level: 'silent' });
const authDir = path.join('store', 'auth');

if (!fs.existsSync(authDir)) {
  console.error('NO_AUTH');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { state, saveCreds } = await useMultiFileAuthState(authDir);

const sock = makeWASocket({
  auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
  printQRInTerminal: false,
  logger,
  browser: Browsers.macOS('Chrome'),
});

const timeout = setTimeout(() => {
  console.error('TIMEOUT');
  process.exit(1);
}, 30000);

sock.ev.on('creds.update', saveCreds);

sock.ev.on('connection.update', async (update) => {
  if (update.connection === 'open') {
    try {
      const groups = await sock.groupFetchAllParticipating();
      const now = new Date().toISOString();
      let count = 0;
      const rows = [];
      for (const [jid, metadata] of Object.entries(groups)) {
        if (metadata.subject) {
          rows.push({ jid, name: metadata.subject, last_message_time: now, is_group: true, channel: 'whatsapp' });
          count++;
        }
      }
      if (rows.length > 0) {
        const { error } = await supabase.from('ob_nc_chats').upsert(rows, { onConflict: 'jid' });
        if (error) console.error('UPSERT_ERROR:' + error.message);
      }
      console.log('SYNCED:' + count);
    } catch (err) {
      console.error('FETCH_ERROR:' + err.message);
    } finally {
      clearTimeout(timeout);
      sock.end(undefined);
      process.exit(0);
    }
  } else if (update.connection === 'close') {
    clearTimeout(timeout);
    console.error('CONNECTION_CLOSED');
    process.exit(1);
  }
});
`;

    const tmpScript = path.join(projectRoot, '.tmp-group-sync.mjs');
    fs.writeFileSync(tmpScript, syncScript, 'utf-8');
    try {
      const output = execSync(`node ${tmpScript}`, {
        cwd: projectRoot,
        encoding: 'utf-8',
        timeout: 45000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      syncOk = output.includes('SYNCED:');
      logger.info({ output: output.trim() }, 'Sync output');
    } finally {
      try { fs.unlinkSync(tmpScript); } catch { /* ignore cleanup errors */ }
    }
  } catch (err) {
    logger.error({ err }, 'Sync failed');
  }

  // Count groups in DB using Supabase
  let groupsInDb = 0;
  try {
    const { count, error } = await supabaseAdmin
      .from('ob_nc_chats')
      .select('*', { count: 'exact', head: true })
      .like('jid', '%@g.us')
      .neq('jid', '__group_sync__');
    if (!error && count !== null) groupsInDb = count;
  } catch {
    // DB may not exist yet
  }

  const status = syncOk ? 'success' : 'failed';

  emitStatus('SYNC_GROUPS', {
    BUILD: buildOk ? 'success' : 'failed',
    SYNC: syncOk ? 'success' : 'failed',
    GROUPS_IN_DB: groupsInDb,
    STATUS: status,
    LOG: 'logs/setup.log',
  });

  if (status === 'failed') process.exit(1);
}
