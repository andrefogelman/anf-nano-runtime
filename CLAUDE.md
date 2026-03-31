# OrcaBot

AI-powered construction budgeting platform on NanoClaw.

## Stack
- Node.js 20+ / TypeScript / ES Modules
- NanoClaw (fork of qwibitai/nanoclaw)
- Supabase (Postgres + Auth + Storage + Realtime) — NO SQLite
- Docker for agent containers
- Vitest for tests
- Bun as package manager

## Commands
- `bun install` — install dependencies
- `bun run dev` — dev mode with hot reload
- `bun run build` — compile TypeScript
- `bun run test` — run tests
- `bun run typecheck` — type check

## Architecture
- `src/` — NanoClaw runtime customized for OrcaBot
- `agents/` — 4 specialized agents (orcamentista, estrutural, hidraulico, eletricista)
- `container/skills/` — PDF pipeline, SINAPI lookup, Excel export
- `frontend/` — React + Vite web app
- `supabase/migrations/` — Postgres migrations

## Rules
- ZERO SQLite — everything in Supabase Postgres
- All agent state persisted to Postgres
- LLM proxy embedded (not dependent on King)
