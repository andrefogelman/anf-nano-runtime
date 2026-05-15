# Orcamentista IA — instructions for Claude Code

## O que é

SaaS de orçamento de obra com IA. Frontend Vite + React 18, backend FastAPI Python single-function no Vercel, Supabase como banco/auth/storage. Sem Docker, sem Fly.io, sem SQLite, sem Stripe.

## Stack

- **Frontend** Vite 5.4 + React 18.3 + Tailwind + shadcn/ui + TanStack Query (`frontend/`)
- **Backend** FastAPI (Python 3.13) em `api/index.py` — única Vercel Function
- **Banco** Supabase Postgres 17 (project `baebsednxclzqukzxkbg`, sa-east-1)
- **Vision LLM** gaik[vision-extract] multi-provider (OpenAI default)
- **Embeddings** OpenAI `text-embedding-3-small` com `dimensions=384` (mantém schema vector(384))
- **DXF** ezdxf (parser) + dxf-viewer/Three.js (viewer 3D no frontend)
- **Excel** openpyxl · **PDF** reportlab
- **E2E** Playwright

## Estrutura `api/`

```
api/
├── index.py              FastAPI app entry
├── routers/
│   ├── ask.py            POST /api/ask           — Vision Q&A + cache + log
│   ├── extract.py        POST /api/extract/{d}   — Vision schema-driven (5 disciplinas)
│   ├── dxf.py            POST /api/dxf/*         — parse, areas, count, text
│   ├── sinapi.py         POST /api/sinapi/match  — embedding + rerank
│   ├── admin.py          POST /api/admin/sinapi/reembed (CRON_SECRET)
│   ├── cron.py           GET  /api/cron/sinapi/refresh (Vercel cron mensal)
│   ├── export.py         POST /api/export/{xlsx,memorial,bdi/calc}
│   └── templates.py      GET  /api/templates/perguntas[/{disc}]
├── lib/
│   ├── supabase.py       service-role client (lru_cache)
│   ├── auth.py           require_user_jwt (HS256 + audience), require_auth (dual JWT|API_SECRET)
│   ├── cache.py          ob_vision_cache get/put
│   └── audit.py          log_action() best-effort em ob_audit_log
├── schemas/              Pydantic models (extra=forbid)
└── engines/              vision (gaik), dxf (ezdxf), sinapi (OpenAI), xlsx (openpyxl),
                          memorial (reportlab), bdi (TCU 2622/2013)
```

## Comandos

| Ação | Comando |
| ---- | ------- |
| Frontend dev | `bun run dev:web` (alias de `cd frontend && bun run dev`) |
| Backend dev | `bun run dev:api` (uvicorn --reload :3001, requer .venv) |
| Build frontend | `bun run build` |
| Typecheck frontend | `bun run typecheck` |
| Playwright E2E | `cd frontend && bun playwright test` |
| Aplicar migration | MCP `mcp__claude_ai_Supabase__apply_migration` (preferido) |
| Smoke healthz prod | `curl https://orcabot-mu.vercel.app/api/healthz` |

## Regras absolutas

- ❌ NÃO usar Docker, Fly.io, OCI, SQLite local, Stripe, Next.js
- ❌ NÃO modificar migrations antigas — só adicionar com timestamp maior
- ❌ NÃO commitar `.claude/skills/`, `frontend/.env.prod`, screenshots da raiz
- ❌ NÃO recriar runtime NanoClaw — `src/`, `agents/`, `container/` foram intencionalmente apagados
- ❌ NÃO diferir features sem perguntar primeiro (lição do Sprint 2 DXF viewer)
- ✅ Toda tabela nova deve ter prefixo `ob_*` (Supabase compartilhado com outros projetos)
- ✅ Toda tabela nova deve ter RLS via `org_id IN (SELECT org_id FROM ob_org_members WHERE user_id = auth.uid())`
- ✅ Frontend chama backend via `import.meta.env.VITE_ORCABOT_API_URL` + `Authorization: Bearer <jwt>`
- ✅ Backend aceita auth dual: Supabase JWT OU `ORCABOT_API_SECRET` (legado, migrar gradualmente)
- ✅ Endpoints sensíveis (export, sinapi/match, admin/*, cron/*) registram em `ob_audit_log` via `log_action()`
- ✅ Pyright errors em arquivos novos do `api/` são esperados (Python deps não instaladas localmente — Vercel runtime resolve via requirements.txt)

## Migrations recentes

| Timestamp | Tabela / mudança |
| --- | --- |
| `20260410000002` | `ob_vision_cache` + `ob_vision_queries` |
| `20260514000001` | `ob_cross_checks` (vision vs dxf) |
| `20260515000001` | RPC `atualizar_curva_abc(project_id)` |
| `20260515000002` | `ob_audit_log` |

## Limites Vercel Hobby

- maxDuration **60s** — default reasoning_effort `"medium"` (~30s). `"high"` opt-in.
- Bundle **<250MB** — não voltar pra sentence-transformers (estoura 5GB).
- Memory **1024MB** — gaik vision pico ~400MB.

## Convenções

- Commits conventional: `feat()`, `fix()`, `chore()`, `docs()`, escopo entre parênteses, descrição em pt-BR.
- Branch isolado por sprint (`feat/<descrição>`). Não commitar direto em main.
- Smoke após cada commit: `curl https://<preview>/api/healthz` e validar frontend builda.
- Antes de deletar coisas grandes: snapshot via `git ls-tree HEAD --name-only -r > /tmp/snapshot.txt`.
- Quando adicionar lib npm pesada: validar build local + adicionar em `vendor-*` chunk no `vite.config.ts` `manualChunks`.

## Tabs do projeto (frontend)

`frontend/src/contexts/ProjectContext.tsx` define o union `WorkspaceTab`. Pra adicionar tab nova:
1. Adicionar valor no union
2. Adicionar entrada em `WorkspaceTabs.tsx` `TABS[]`
3. Criar `<NomeTab />` wrapper em `frontend/src/components/workspace/`
4. Wire em `ProjectPage.tsx` `{activeTab === "x" && <XTab />}`

Pattern usado nos Sprints 1-3: `useProjectContext().project` no wrapper passa `projectId` pro panel real.

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — diagrama, decisões, restrições, roadmap
- [docs/DEPLOY.md](docs/DEPLOY.md) — Vercel project + env vars + smoke check
- [docs/DEV.md](docs/DEV.md) — setup local + dev flow + convenções
- [docs/API.md](docs/API.md) — endpoints com curl examples (mantenha em sync ao adicionar rota)
- [docs/SCHEMA.md](docs/SCHEMA.md) — tabelas `ob_*` + RPCs + índices
- [docs/MIGRATION.md](docs/MIGRATION.md) — mapeamento endpoints legados → novos

## Ações manuais pendentes (pós-deploy)

1. **Setar secrets no Vercel** (production + preview + development): `OPENAI_API_KEY`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET`, `ORCABOT_API_SECRET`, `CRON_SECRET`
2. **Re-embedar SINAPI chunks** (1x): `POST /api/admin/sinapi/reembed?offset=N&limit=500` em loop até `next_offset=null`. ~$1.36, ~27 chamadas.
3. **Setar Vercel Cron Secret** (Settings → Crons) batendo com `CRON_SECRET` env.
