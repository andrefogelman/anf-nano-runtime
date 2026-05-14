# Orcamentista IA — instructions for Claude Code

## O que é

SaaS de orçamento de obra com IA. Frontend Vite + React 18, backend FastAPI Python single-function no Vercel, Supabase como banco/auth/storage. Sem Docker, sem Fly.io, sem SQLite, sem Stripe.

## Stack

- **Frontend** Vite 5.4 + React 18.3 + Tailwind + shadcn/ui + TanStack Query (`frontend/`)
- **Backend** FastAPI (Python 3.13) em `api/index.py` — única Vercel Function
- **Banco** Supabase Postgres 17 (project `baebsednxclzqukzxkbg`, sa-east-1)
- **Vision LLM** gaik[vision-extract] multi-provider (OpenAI default)
- **Vector** pgvector + sentence-transformers MiniLM-L6-v2 (384-dim)

## Comandos

| Ação                  | Comando                                                |
| --------------------- | ------------------------------------------------------ |
| Frontend dev          | `bun run dev:web` (alias de `cd frontend && bun run dev`) |
| Backend dev           | `bun run dev:api` (uvicorn --reload :3001, requer .venv) |
| Build frontend        | `bun run build`                                        |
| Typecheck frontend    | `bun run typecheck`                                    |
| Aplicar migration     | MCP `mcp__claude_ai_Supabase__apply_migration` (preferido)<br>OU `supabase db push` |
| Smoke healthz prod    | `curl https://<deploy>/api/healthz`                    |

## Regras absolutas

- ❌ NÃO usar Docker, Fly.io, OCI, SQLite local, Stripe, Next.js
- ❌ NÃO modificar migrations antigas — só adicionar com timestamp maior
- ❌ NÃO commitar `.claude/skills/`, `frontend/.env.prod`, screenshots da raiz
- ❌ NÃO recriar runtime NanoClaw — `src/`, `agents/`, `container/` foram intencionalmente apagados
- ✅ Toda tabela nova deve ter prefixo `ob_*` (escopo OrcaBot — Supabase é compartilhado com outros projetos)
- ✅ Toda tabela nova deve ter RLS via padrão `org_id IN (SELECT org_id FROM ob_org_members WHERE user_id = auth.uid())`
- ✅ Migrations: timestamp `YYYYMMDDhhmmss` em `supabase/migrations/`. Última: `20260410000002_vision_cache_and_queries.sql`
- ✅ Frontend chama backend via `import.meta.env.VITE_ORCABOT_API_URL` + `Authorization: Bearer ${VITE_ORCABOT_API_SECRET}`
- ✅ Backend aceita auth dual: Supabase JWT OU `ORCABOT_API_SECRET` (legado, migrar gradualmente)

## Estrutura

```
api/
├── index.py              FastAPI app entry
├── routers/{ask,extract,dxf,sinapi}.py    Stubs 501 (Sprints 1-3)
├── lib/{supabase,auth,cache}.py
├── schemas/{ask,extract,dxf}.py           Pydantic models
└── engines/{vision,dxf,sinapi}.py         Business logic (placeholder)
```

## Endpoints novos (a implementar)

| Endpoint                | Sprint | Substitui (legado)              |
| ----------------------- | ------ | ------------------------------- |
| `GET  /api/healthz`     | 0 ✅   | —                                |
| `POST /api/ask`         | 1      | `/api/agent-chat`, `/api/process` (parcial) |
| `POST /api/extract`     | 2      | `/api/process` (schema-driven)   |
| `POST /api/dxf/*`       | 2      | (novo)                           |
| `POST /api/sinapi/match` | 3     | `/api/caderno-query`             |
| `POST /api/xlsx/render` | 4      | (novo)                           |

Mapping completo em [docs/MIGRATION.md](docs/MIGRATION.md).

## Limites Vercel Hobby

- maxDuration **60s** — default reasoning_effort `"medium"` (~30s). `"high"` opt-in.
- Bundle **<250MB** — sentence-transformers ~150MB, cuidado.
- Memory **1024MB** — gaik vision pico ~400MB.

Se 60s não bastar consistentemente, sugerir upgrade Pro ($20/mês → 300s via Fluid Compute).

## Convenções

- Commits conventional: `feat()`, `fix()`, `chore()`, `docs()`, escopo entre parênteses, descrição em pt-BR.
- Branch isolado por sprint (`feat/<descrição>`). Não commitar direto em main.
- Smoke após cada commit: `curl https://<preview>/api/healthz` e validar frontend builda.
- Antes de deletar coisas grandes: snapshot via `git ls-tree HEAD --name-only -r > /tmp/snapshot.txt`.

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — diagrama, decisões, restrições, roadmap
- [docs/DEPLOY.md](docs/DEPLOY.md) — Vercel project + env vars + smoke check
- [docs/DEV.md](docs/DEV.md) — setup local + dev flow + convenções
- [docs/MIGRATION.md](docs/MIGRATION.md) — mapeamento endpoints legados → novos
