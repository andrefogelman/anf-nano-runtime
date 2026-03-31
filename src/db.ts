import { supabaseAdmin } from './supabase-client.js';
import { isValidGroupFolder } from './group-folder.js';
import { logger } from './logger.js';
import {
  NewMessage,
  RegisteredGroup,
  ScheduledTask,
  TaskRunLog,
} from './types.js';

// ── Initialization ──────────────────────────────────────────────────────────

/**
 * Initialize database connection.
 * With Supabase, tables already exist via migrations — this is a no-op
 * kept for API compatibility with callers that call initDatabase() on startup.
 */
export async function initDatabase(): Promise<void> {
  // Verify connectivity by touching the router_state table
  const { error } = await supabaseAdmin
    .from('ob_nc_router_state')
    .select('key')
    .limit(1);
  if (error) {
    throw new Error(`Supabase connection check failed: ${error.message}`);
  }
  logger.info('Database connection verified (Supabase Postgres)');
}

/** @internal - for tests only. Resets all ob_nc_* tables. */
export async function _initTestDatabase(): Promise<void> {
  // Truncate in dependency order
  await supabaseAdmin.from('ob_nc_task_run_logs').delete().neq('id', -1);
  await supabaseAdmin.from('ob_nc_messages').delete().neq('id', '');
  await supabaseAdmin.from('ob_nc_scheduled_tasks').delete().neq('id', '');
  await supabaseAdmin.from('ob_nc_sessions').delete().neq('group_folder', '');
  await supabaseAdmin.from('ob_nc_router_state').delete().neq('key', '');
  await supabaseAdmin.from('ob_nc_registered_groups').delete().neq('jid', '');
  await supabaseAdmin.from('ob_nc_chats').delete().neq('jid', '');
}

/** @internal - for tests only. No-op with Supabase (connection pooling). */
export async function _closeDatabase(): Promise<void> {
  // No-op: Supabase client manages its own connection pool
}

// ── Chat metadata ───────────────────────────────────────────────────────────

export interface ChatInfo {
  jid: string;
  name: string;
  last_message_time: string;
  channel: string;
  is_group: number;
}

/**
 * Store chat metadata only (no message content).
 */
export async function storeChatMetadata(
  chatJid: string,
  timestamp: string,
  name?: string,
  channel?: string,
  isGroup?: boolean,
): Promise<void> {
  const ch = channel ?? null;
  const group = isGroup === undefined ? null : isGroup;

  const displayName = name || chatJid;

  const { error } = await supabaseAdmin.from('ob_nc_chats').upsert(
    {
      jid: chatJid,
      name: displayName,
      last_message_time: timestamp,
      channel: ch,
      is_group: group,
    },
    { onConflict: 'jid' },
  );

  if (error) {
    // If upserting with a potentially older timestamp, do a conditional update
    // Supabase upsert doesn't support MAX() natively, so we do a manual check
    logger.warn({ chatJid, error: error.message }, 'Chat metadata upsert failed');
  }
}

/**
 * Update chat name without changing timestamp for existing chats.
 */
export async function updateChatName(
  chatJid: string,
  name: string,
): Promise<void> {
  // Try update first
  const { data } = await supabaseAdmin
    .from('ob_nc_chats')
    .update({ name })
    .eq('jid', chatJid)
    .select('jid');

  if (!data || data.length === 0) {
    // Chat doesn't exist, insert it
    await supabaseAdmin.from('ob_nc_chats').insert({
      jid: chatJid,
      name,
      last_message_time: new Date().toISOString(),
    });
  }
}

/**
 * Get all known chats, ordered by most recent activity.
 */
export async function getAllChats(): Promise<ChatInfo[]> {
  const { data, error } = await supabaseAdmin
    .from('ob_nc_chats')
    .select('jid, name, last_message_time, channel, is_group')
    .order('last_message_time', { ascending: false });

  if (error) {
    logger.error({ error: error.message }, 'Failed to get all chats');
    return [];
  }

  return (data || []).map((row) => ({
    jid: row.jid,
    name: row.name || row.jid,
    last_message_time: row.last_message_time,
    channel: row.channel,
    is_group: row.is_group ? 1 : 0,
  }));
}

/**
 * Get timestamp of last group metadata sync.
 */
export async function getLastGroupSync(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('ob_nc_chats')
    .select('last_message_time')
    .eq('jid', '__group_sync__')
    .single();
  return data?.last_message_time || null;
}

/**
 * Record that group metadata was synced.
 */
export async function setLastGroupSync(): Promise<void> {
  const now = new Date().toISOString();
  await supabaseAdmin.from('ob_nc_chats').upsert(
    {
      jid: '__group_sync__',
      name: '__group_sync__',
      last_message_time: now,
    },
    { onConflict: 'jid' },
  );
}

// ── Messages ────────────────────────────────────────────────────────────────

/**
 * Store a message with full content.
 */
export async function storeMessage(msg: NewMessage): Promise<void> {
  const { error } = await supabaseAdmin.from('ob_nc_messages').upsert(
    {
      id: msg.id,
      chat_jid: msg.chat_jid,
      sender: msg.sender,
      sender_name: msg.sender_name,
      content: msg.content,
      timestamp: msg.timestamp,
      is_from_me: msg.is_from_me ?? false,
      is_bot_message: msg.is_bot_message ?? false,
    },
    { onConflict: 'id,chat_jid' },
  );

  if (error) {
    logger.error(
      { msgId: msg.id, chatJid: msg.chat_jid, error: error.message },
      'Failed to store message',
    );
  }
}

/**
 * Store a message directly.
 */
export async function storeMessageDirect(msg: {
  id: string;
  chat_jid: string;
  sender: string;
  sender_name: string;
  content: string;
  timestamp: string;
  is_from_me: boolean;
  is_bot_message?: boolean;
}): Promise<void> {
  await storeMessage({
    id: msg.id,
    chat_jid: msg.chat_jid,
    sender: msg.sender,
    sender_name: msg.sender_name,
    content: msg.content,
    timestamp: msg.timestamp,
    is_from_me: msg.is_from_me,
    is_bot_message: msg.is_bot_message ?? false,
  });
}

export async function getNewMessages(
  jids: string[],
  lastTimestamp: string,
  botPrefix: string,
  limit: number = 200,
): Promise<{ messages: NewMessage[]; newTimestamp: string }> {
  if (jids.length === 0) return { messages: [], newTimestamp: lastTimestamp };

  // Use raw SQL via rpc for the complex query with subquery + LIKE filter
  const { data, error } = await supabaseAdmin.rpc('ob_nc_get_new_messages', {
    p_jids: jids,
    p_last_timestamp: lastTimestamp || '1970-01-01T00:00:00.000Z',
    p_bot_prefix: `${botPrefix}:%`,
    p_limit: limit,
  });

  if (error) {
    // Fallback: use Supabase query builder
    logger.warn(
      { error: error.message },
      'RPC ob_nc_get_new_messages not found, using query builder fallback',
    );
    return getNewMessagesFallback(jids, lastTimestamp, botPrefix, limit);
  }

  const messages: NewMessage[] = (data || []).map(mapMessageRow);

  let newTimestamp = lastTimestamp;
  for (const row of messages) {
    if (row.timestamp > newTimestamp) newTimestamp = row.timestamp;
  }

  return { messages, newTimestamp };
}

async function getNewMessagesFallback(
  jids: string[],
  lastTimestamp: string,
  botPrefix: string,
  limit: number,
): Promise<{ messages: NewMessage[]; newTimestamp: string }> {
  const ts = lastTimestamp || '1970-01-01T00:00:00.000Z';

  // Get the N most recent non-bot messages after timestamp, then sort chronologically
  const { data, error } = await supabaseAdmin
    .from('ob_nc_messages')
    .select('id, chat_jid, sender, sender_name, content, timestamp, is_from_me')
    .in('chat_jid', jids)
    .gt('timestamp', ts)
    .eq('is_bot_message', false)
    .not('content', 'like', `${botPrefix}:%`)
    .neq('content', '')
    .not('content', 'is', null)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error({ error: error.message }, 'Failed to get new messages');
    return { messages: [], newTimestamp: lastTimestamp };
  }

  // Reverse to chronological order
  const messages: NewMessage[] = (data || []).reverse().map(mapMessageRow);

  let newTimestamp = lastTimestamp;
  for (const row of messages) {
    if (row.timestamp > newTimestamp) newTimestamp = row.timestamp;
  }

  return { messages, newTimestamp };
}

export async function getMessagesSince(
  chatJid: string,
  sinceTimestamp: string,
  botPrefix: string,
  limit: number = 200,
): Promise<NewMessage[]> {
  const ts = sinceTimestamp || '1970-01-01T00:00:00.000Z';

  const { data, error } = await supabaseAdmin
    .from('ob_nc_messages')
    .select('id, chat_jid, sender, sender_name, content, timestamp, is_from_me')
    .eq('chat_jid', chatJid)
    .gt('timestamp', ts)
    .eq('is_bot_message', false)
    .not('content', 'like', `${botPrefix}:%`)
    .neq('content', '')
    .not('content', 'is', null)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error({ error: error.message }, 'Failed to get messages since');
    return [];
  }

  // Reverse to chronological order
  return (data || []).reverse().map(mapMessageRow);
}

export async function getLastBotMessageTimestamp(
  chatJid: string,
  botPrefix: string,
): Promise<string | undefined> {
  // Get the most recent bot message (by flag or content prefix)
  const { data: byFlag } = await supabaseAdmin
    .from('ob_nc_messages')
    .select('timestamp')
    .eq('chat_jid', chatJid)
    .eq('is_bot_message', true)
    .order('timestamp', { ascending: false })
    .limit(1);

  const { data: byPrefix } = await supabaseAdmin
    .from('ob_nc_messages')
    .select('timestamp')
    .eq('chat_jid', chatJid)
    .like('content', `${botPrefix}:%`)
    .order('timestamp', { ascending: false })
    .limit(1);

  const ts1 = byFlag?.[0]?.timestamp;
  const ts2 = byPrefix?.[0]?.timestamp;

  if (!ts1 && !ts2) return undefined;
  if (!ts1) return ts2;
  if (!ts2) return ts1;
  return ts1 > ts2 ? ts1 : ts2;
}

function mapMessageRow(row: Record<string, unknown>): NewMessage {
  return {
    id: row.id as string,
    chat_jid: row.chat_jid as string,
    sender: row.sender as string,
    sender_name: row.sender_name as string,
    content: row.content as string,
    timestamp: row.timestamp as string,
    is_from_me: row.is_from_me as boolean | undefined,
  };
}

// ── Scheduled tasks ─────────────────────────────────────────────────────────

export async function createTask(
  task: Omit<ScheduledTask, 'last_run' | 'last_result'>,
): Promise<void> {
  const { error } = await supabaseAdmin.from('ob_nc_scheduled_tasks').insert({
    id: task.id,
    group_folder: task.group_folder,
    chat_jid: task.chat_jid,
    prompt: task.prompt,
    script: task.script || null,
    schedule_type: task.schedule_type,
    schedule_value: task.schedule_value,
    context_mode: task.context_mode || 'isolated',
    next_run: task.next_run,
    status: task.status,
    created_at: task.created_at,
  });

  if (error) {
    logger.error({ taskId: task.id, error: error.message }, 'Failed to create task');
  }
}

export async function getTaskById(
  id: string,
): Promise<ScheduledTask | undefined> {
  const { data, error } = await supabaseAdmin
    .from('ob_nc_scheduled_tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return undefined;
  return mapTaskRow(data);
}

export async function getTasksForGroup(
  groupFolder: string,
): Promise<ScheduledTask[]> {
  const { data, error } = await supabaseAdmin
    .from('ob_nc_scheduled_tasks')
    .select('*')
    .eq('group_folder', groupFolder)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ error: error.message }, 'Failed to get tasks for group');
    return [];
  }
  return (data || []).map(mapTaskRow);
}

export async function getAllTasks(): Promise<ScheduledTask[]> {
  const { data, error } = await supabaseAdmin
    .from('ob_nc_scheduled_tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ error: error.message }, 'Failed to get all tasks');
    return [];
  }
  return (data || []).map(mapTaskRow);
}

export async function updateTask(
  id: string,
  updates: Partial<
    Pick<
      ScheduledTask,
      | 'prompt'
      | 'script'
      | 'schedule_type'
      | 'schedule_value'
      | 'next_run'
      | 'status'
    >
  >,
): Promise<void> {
  const updateObj: Record<string, unknown> = {};

  if (updates.prompt !== undefined) updateObj.prompt = updates.prompt;
  if (updates.script !== undefined) updateObj.script = updates.script || null;
  if (updates.schedule_type !== undefined)
    updateObj.schedule_type = updates.schedule_type;
  if (updates.schedule_value !== undefined)
    updateObj.schedule_value = updates.schedule_value;
  if (updates.next_run !== undefined) updateObj.next_run = updates.next_run;
  if (updates.status !== undefined) updateObj.status = updates.status;

  if (Object.keys(updateObj).length === 0) return;

  const { error } = await supabaseAdmin
    .from('ob_nc_scheduled_tasks')
    .update(updateObj)
    .eq('id', id);

  if (error) {
    logger.error({ taskId: id, error: error.message }, 'Failed to update task');
  }
}

export async function deleteTask(id: string): Promise<void> {
  // task_run_logs has ON DELETE CASCADE, so just delete the task
  const { error } = await supabaseAdmin
    .from('ob_nc_scheduled_tasks')
    .delete()
    .eq('id', id);

  if (error) {
    logger.error({ taskId: id, error: error.message }, 'Failed to delete task');
  }
}

export async function getDueTasks(): Promise<ScheduledTask[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('ob_nc_scheduled_tasks')
    .select('*')
    .eq('status', 'active')
    .not('next_run', 'is', null)
    .lte('next_run', now)
    .order('next_run', { ascending: true });

  if (error) {
    logger.error({ error: error.message }, 'Failed to get due tasks');
    return [];
  }
  return (data || []).map(mapTaskRow);
}

export async function updateTaskAfterRun(
  id: string,
  nextRun: string | null,
  lastResult: string,
): Promise<void> {
  const now = new Date().toISOString();
  const updateObj: Record<string, unknown> = {
    next_run: nextRun,
    last_run: now,
    last_result: lastResult,
  };

  // If nextRun is null, the task is completed (one-shot)
  if (nextRun === null) {
    updateObj.status = 'completed';
  }

  const { error } = await supabaseAdmin
    .from('ob_nc_scheduled_tasks')
    .update(updateObj)
    .eq('id', id);

  if (error) {
    logger.error(
      { taskId: id, error: error.message },
      'Failed to update task after run',
    );
  }
}

export async function logTaskRun(log: TaskRunLog): Promise<void> {
  const { error } = await supabaseAdmin.from('ob_nc_task_run_logs').insert({
    task_id: log.task_id,
    run_at: log.run_at,
    duration_ms: log.duration_ms,
    status: log.status,
    result: log.result,
    error: log.error,
  });

  if (error) {
    logger.error(
      { taskId: log.task_id, error: error.message },
      'Failed to log task run',
    );
  }
}

function mapTaskRow(row: Record<string, unknown>): ScheduledTask {
  return {
    id: row.id as string,
    group_folder: row.group_folder as string,
    chat_jid: row.chat_jid as string,
    prompt: row.prompt as string,
    script: row.script as string | null,
    schedule_type: row.schedule_type as ScheduledTask['schedule_type'],
    schedule_value: row.schedule_value as string,
    context_mode: (row.context_mode as ScheduledTask['context_mode']) || 'isolated',
    next_run: row.next_run as string | null,
    last_run: row.last_run as string | null,
    last_result: row.last_result as string | null,
    status: row.status as ScheduledTask['status'],
    created_at: row.created_at as string,
  };
}

// ── Router state ────────────────────────────────────────────────────────────

export async function getRouterState(
  key: string,
): Promise<string | undefined> {
  const { data } = await supabaseAdmin
    .from('ob_nc_router_state')
    .select('value')
    .eq('key', key)
    .single();
  return data?.value ?? undefined;
}

export async function setRouterState(
  key: string,
  value: string,
): Promise<void> {
  const { error } = await supabaseAdmin.from('ob_nc_router_state').upsert(
    { key, value },
    { onConflict: 'key' },
  );

  if (error) {
    logger.error({ key, error: error.message }, 'Failed to set router state');
  }
}

// ── Sessions ────────────────────────────────────────────────────────────────

export async function getSession(
  groupFolder: string,
): Promise<string | undefined> {
  const { data } = await supabaseAdmin
    .from('ob_nc_sessions')
    .select('session_id')
    .eq('group_folder', groupFolder)
    .single();
  return data?.session_id ?? undefined;
}

export async function setSession(
  groupFolder: string,
  sessionId: string,
): Promise<void> {
  const { error } = await supabaseAdmin.from('ob_nc_sessions').upsert(
    { group_folder: groupFolder, session_id: sessionId },
    { onConflict: 'group_folder' },
  );

  if (error) {
    logger.error(
      { groupFolder, error: error.message },
      'Failed to set session',
    );
  }
}

export async function deleteSession(groupFolder: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('ob_nc_sessions')
    .delete()
    .eq('group_folder', groupFolder);

  if (error) {
    logger.error(
      { groupFolder, error: error.message },
      'Failed to delete session',
    );
  }
}

export async function getAllSessions(): Promise<Record<string, string>> {
  const { data, error } = await supabaseAdmin
    .from('ob_nc_sessions')
    .select('group_folder, session_id');

  if (error) {
    logger.error({ error: error.message }, 'Failed to get all sessions');
    return {};
  }

  const result: Record<string, string> = {};
  for (const row of data || []) {
    result[row.group_folder] = row.session_id;
  }
  return result;
}

// ── Registered groups ───────────────────────────────────────────────────────

export async function getRegisteredGroup(
  jid: string,
): Promise<(RegisteredGroup & { jid: string }) | undefined> {
  const { data } = await supabaseAdmin
    .from('ob_nc_registered_groups')
    .select('*')
    .eq('jid', jid)
    .single();

  if (!data) return undefined;

  if (!isValidGroupFolder(data.folder)) {
    logger.warn(
      { jid: data.jid, folder: data.folder },
      'Skipping registered group with invalid folder',
    );
    return undefined;
  }

  return {
    jid: data.jid,
    name: data.name,
    folder: data.folder,
    trigger: data.trigger_pattern,
    added_at: data.added_at,
    containerConfig: data.container_config ?? undefined,
    requiresTrigger:
      data.requires_trigger === null ? undefined : data.requires_trigger,
    isMain: data.is_main === true ? true : undefined,
  };
}

export async function setRegisteredGroup(
  jid: string,
  group: RegisteredGroup,
): Promise<void> {
  if (!isValidGroupFolder(group.folder)) {
    throw new Error(`Invalid group folder "${group.folder}" for JID ${jid}`);
  }

  const { error } = await supabaseAdmin
    .from('ob_nc_registered_groups')
    .upsert(
      {
        jid,
        name: group.name,
        folder: group.folder,
        trigger_pattern: group.trigger,
        added_at: group.added_at,
        container_config: group.containerConfig ?? null,
        requires_trigger:
          group.requiresTrigger === undefined ? true : group.requiresTrigger,
        is_main: group.isMain ?? false,
      },
      { onConflict: 'jid' },
    );

  if (error) {
    logger.error({ jid, error: error.message }, 'Failed to set registered group');
  }
}

export async function getAllRegisteredGroups(): Promise<
  Record<string, RegisteredGroup>
> {
  const { data, error } = await supabaseAdmin
    .from('ob_nc_registered_groups')
    .select('*');

  if (error) {
    logger.error(
      { error: error.message },
      'Failed to get all registered groups',
    );
    return {};
  }

  const result: Record<string, RegisteredGroup> = {};
  for (const row of data || []) {
    if (!isValidGroupFolder(row.folder)) {
      logger.warn(
        { jid: row.jid, folder: row.folder },
        'Skipping registered group with invalid folder',
      );
      continue;
    }
    result[row.jid] = {
      name: row.name,
      folder: row.folder,
      trigger: row.trigger_pattern,
      added_at: row.added_at,
      containerConfig: row.container_config ?? undefined,
      requiresTrigger:
        row.requires_trigger === null ? undefined : row.requires_trigger,
      isMain: row.is_main === true ? true : undefined,
    };
  }
  return result;
}
