# Arquitetura — Orcamentista IA

## Visão geral

```
┌──────────────────────────────────────────────────────────────┐
│                     Vercel (Hobby plan)                      │
│  ┌─────────────────┐         ┌──────────────────────────┐    │
│  │  Static frontend│         │  Python Function         │    │
│  │  (Vite + React) │  /api/* │  api/index.py (FastAPI)  │    │
│  │  frontend/dist/ │ ──────► │  • /api/healthz          │    │
│  │                 │         │  • /api/ask  (Sprint 1)  │    │
│  │  Login/Dashboard│         │  • /api/extract (S2)     │    │
│  │  ProjectPage    │         │  • /api/dxf/* (S2)       │    │
│  │  SINAPI/TCPO    │         │  • /api/sinapi/match (S3)│    │
│  └────────┬────────┘         └────────────┬─────────────┘    │
└───────────┼───────────────────────────────┼──────────────────┘
            │                               │
            │ Supabase JS client            │ supabase-py (service role)
            ▼                               ▼
┌──────────────────────────────────────────────────────────────┐
│                Supabase (sa-east-1, Postgres 17)             │
│                 baebsednxclzqukzxkbg                         │
│                                                              │
│  • Auth (Supabase Auth)                                      │
│  • Postgres com schema ob_*                                  │
│      ob_organizations / ob_org_members  (multi-tenant RLS)   │
│      ob_projects / ob_project_files / ob_pdf_pages           │
│      ob_quantitativos / ob_orcamento_items                   │
│      ob_sinapi_* / ob_tcpo_* / ob_propostas                  │
│      ob_vision_cache / ob_vision_queries  (Sprint 0 ✓)       │
│  • Storage (PDFs, DXFs, xlsx exports, cadernos SINAPI)       │
│  • Realtime (notificar UI quando job termina)                │
│  • pgvector (search_sinapi_chunks 384-dim, MiniLM-L6-v2)     │
└──────────────────────────────────────────────────────────────┘
            ▲                               ▲
            │                               │ HTTPS
            └─────── usuário (browser) ─────┘
```

## Camadas

| Camada              | Tech                                                                      |
| ------------------- | ------------------------------------------------------------------------- |
| Frontend            | Vite 5.4 + React 18.3 + Tailwind + shadcn/ui + TanStack Query             |
| API/Engine          | FastAPI (ASGI) em Python 3.13, single function `api/index.py`             |
| Hosting             | Vercel Hobby ($0). 1 projeto, 1 deployment, 1 função Python.              |
| Banco               | Supabase Postgres 17 + Auth + Storage + Realtime + pgvector               |
| Vision LLM          | gaik[vision-extract] multi-provider (OpenAI default, Claude/Gemini alt)   |
| DXF                 | ezdxf (Sprint 2)                                                          |
| Excel               | openpyxl (Sprint 4)                                                       |
| Embeddings          | sentence-transformers MiniLM-L6-v2 (384-dim)                              |

## Decisões e restrições

- **Sem Docker, sem Fly.io, sem OCI** — Vercel Function Python serverless.
- **Sem SQLite local** — todo cache e histórico em Supabase Postgres.
- **Sem Stripe / cobrança** — Sprint 0-5 não toca billing.
- **maxDuration 60s** (Vercel Hobby). Default `reasoning_effort="medium"` cabe ~30s.
- **Bundle target <250MB**. `sentence-transformers` (~150MB) é o peso pesado.
- **CORS aberto** no Sprint 0. Tightening antes de beta pública (CORS_ORIGINS env).
- **Multi-tenant via RLS** — toda tabela `ob_*` com policies em `ob_org_members.user_id = auth.uid()`.

## Sprints (roadmap)

| Sprint | Escopo | Status |
| ------ | ------ | ------ |
| 0 | Reset NanoClaw + Bootstrap FastAPI + Vercel + migration cache | ✅ |
| 1 | `/api/ask` Vision Q&A + cache + log + tab Q&A Plantas | ✅ |
| 2 | `/api/extract/{disciplina}` (5 schemas) + `/api/dxf/*` + DXF viewer 3D | ✅ |
| 3 | `/api/sinapi/match` (vector + LLM rerank) + cotações CRUD + cron stub | ✅ |
| 4 | `/api/export/{xlsx,memorial,bdi}` + Curva ABC RPC | ✅ |
| 5 | Audit log + LGPD + onboarding + Playwright + docs finais | ✅ |

Beta-ready em ~70h efetivas.

## Arquivos críticos

| Path                                                            | Por quê                                       |
| --------------------------------------------------------------- | --------------------------------------------- |
| `api/index.py`                                                  | Entry FastAPI (Vercel detecta ASGI via `app`) |
| `api/lib/supabase.py`                                           | Service-role client (lru_cache)               |
| `api/lib/auth.py`                                               | Dual auth: API_SECRET OU JWT                  |
| `api/lib/cache.py`                                              | Hash p/ ob_vision_cache                       |
| `frontend/src/pages/AssistenteSinapiPage.tsx`                   | Base SINAPI lookup UI                         |
| `frontend/src/components/planilha/`                             | DataGrid orçamento                            |
| `supabase/migrations/20260403000004_sinapi_vector_search.sql`   | RPC search_sinapi_chunks                      |
| `supabase/migrations/20260410000002_vision_cache_and_queries.sql` | ob_vision_cache + ob_vision_queries (Sprint 0) |
