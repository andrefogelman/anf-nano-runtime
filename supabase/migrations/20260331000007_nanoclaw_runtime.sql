-- 007_nanoclaw_runtime.sql
-- NanoClaw runtime state tables (replaces SQLite db.ts)
-- NO RLS — accessed exclusively via service_role key from NanoClaw runtime

CREATE TABLE IF NOT EXISTS ob_nc_chats (
  jid text PRIMARY KEY,
  name text,
  last_message_time timestamptz,
  channel text,
  is_group boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_ob_nc_chats_time ON ob_nc_chats(last_message_time DESC);

CREATE TABLE IF NOT EXISTS ob_nc_messages (
  id text NOT NULL,
  chat_jid text NOT NULL REFERENCES ob_nc_chats(jid) ON DELETE CASCADE,
  sender text,
  sender_name text,
  content text,
  timestamp timestamptz NOT NULL,
  is_from_me boolean DEFAULT false,
  is_bot_message boolean DEFAULT false,
  PRIMARY KEY (id, chat_jid)
);

CREATE INDEX IF NOT EXISTS idx_ob_nc_messages_timestamp ON ob_nc_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_ob_nc_messages_chat_time ON ob_nc_messages(chat_jid, timestamp);

CREATE TABLE IF NOT EXISTS ob_nc_scheduled_tasks (
  id text PRIMARY KEY,
  group_folder text NOT NULL,
  chat_jid text NOT NULL,
  prompt text NOT NULL,
  script text,
  schedule_type text NOT NULL CHECK (schedule_type IN ('cron', 'interval', 'once')),
  schedule_value text NOT NULL,
  context_mode text DEFAULT 'isolated',
  next_run timestamptz,
  last_run timestamptz,
  last_result text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ob_nc_tasks_next_run ON ob_nc_scheduled_tasks(next_run);
CREATE INDEX IF NOT EXISTS idx_ob_nc_tasks_status ON ob_nc_scheduled_tasks(status);

CREATE TABLE IF NOT EXISTS ob_nc_task_run_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id text NOT NULL REFERENCES ob_nc_scheduled_tasks(id) ON DELETE CASCADE,
  run_at timestamptz NOT NULL,
  duration_ms integer NOT NULL,
  status text NOT NULL,
  result text,
  error text
);

CREATE INDEX IF NOT EXISTS idx_ob_nc_task_run_logs ON ob_nc_task_run_logs(task_id, run_at);

CREATE TABLE IF NOT EXISTS ob_nc_router_state (
  key text PRIMARY KEY,
  value text NOT NULL
);

CREATE TABLE IF NOT EXISTS ob_nc_sessions (
  group_folder text PRIMARY KEY,
  session_id text NOT NULL
);

CREATE TABLE IF NOT EXISTS ob_nc_registered_groups (
  jid text PRIMARY KEY,
  name text NOT NULL,
  folder text NOT NULL UNIQUE,
  trigger_pattern text NOT NULL,
  added_at timestamptz NOT NULL,
  container_config jsonb,
  requires_trigger boolean DEFAULT true,
  is_main boolean DEFAULT false
);

-- No RLS on ob_nc_* tables — service_role only access from NanoClaw runtime
