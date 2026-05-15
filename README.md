# Orcamentista IA

> SaaS multi-tenant pra escritórios brasileiros gerarem orçamento de obra a partir de pacote de projeto (PDFs + DXFs + escopo). IA assiste levantamento via Q&A em planta, matching SINAPI/TCPO, geração de planilha xlsx + memorial de cálculo.

[![Deploy on Vercel](https://img.shields.io/badge/deploy-vercel-black)](https://vercel.com)
[![Supabase](https://img.shields.io/badge/database-supabase-3FCF8E)](https://supabase.com)

---

## Status

| Sprint | Escopo | Status |
| ------ | ------ | ------ |
| 0 | Reset NanoClaw + Bootstrap FastAPI + Vercel | ✅ |
| 1 | `/api/ask` Vision Q&A + cache + log + tab Q&A Plantas | ✅ |
| 2 | `/api/extract/{disciplina}` (5 schemas) + `/api/dxf/*` + DXF viewer 3D | ✅ |
| 3 | `/api/sinapi/match` (vector + LLM rerank) + cotações CRUD + cron | ✅ |
| 4 | `/api/export/{xlsx,memorial,bdi}` + Curva ABC RPC | ✅ |
| 5 | Audit log + LGPD + onboarding + Playwright + docs | ✅ |

## Stack

| Camada | Tech |
| ------ | ---- |
| Frontend | Vite 5.4 + React 18.3 + Tailwind + shadcn/ui + TanStack Query |
| Backend | FastAPI (Python 3.13) — single Vercel function `api/index.py` |
| Hosting | Vercel Hobby (frontend estático + Python serverless function) |
| Banco | Supabase Postgres 17 (Auth + Storage + Realtime + pgvector) |
| Vision LLM | gaik[vision-extract] multi-provider (OpenAI / Claude / Gemini) |
| DXF | ezdxf (parser) + dxf-viewer (Three.js, viewer 3D) |
| Excel | openpyxl |
| PDF | reportlab |
| Embeddings | OpenAI text-embedding-3-small (dim=384, mantém schema vector(384)) |
| E2E tests | Playwright |

## Quick start (dev local)

```bash
git clone https://github.com/andrefogelman/orcabot.git
cd orcabot
cp .env.example .env   # editar com keys reais (ver docs/DEPLOY.md)

# Frontend
cd frontend && bun install && bun run dev      # → http://localhost:3000

# Backend (em outro terminal)
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.index:app --reload --port 3001     # → http://localhost:3001/api/healthz
```

Config `frontend/.env.local`:
```
VITE_ORCABOT_API_URL=http://localhost:3001
VITE_ORCABOT_API_SECRET=<mesmo valor do .env raiz>
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
```

Detalhes em [docs/DEV.md](docs/DEV.md).

## Endpoints (resumo)

| Rota | Método | Auth | Sprint |
| ---- | ------ | ---- | ------ |
| `/api/healthz` | GET | — | 0 |
| `/api/ask` | POST multipart | JWT | 1 |
| `/api/extract/{disciplina}` | POST multipart | JWT | 2 |
| `/api/dxf/{parse,areas,count,text}` | POST multipart | JWT | 2 |
| `/api/sinapi/match` | POST JSON | JWT | 3 |
| `/api/admin/sinapi/reembed` | POST | CRON_SECRET | 3 |
| `/api/cron/sinapi/refresh` | GET | CRON_SECRET | 3 |
| `/api/export/bdi/calc` | POST JSON | JWT | 4 |
| `/api/export/xlsx` | POST JSON | JWT | 4 |
| `/api/export/memorial` | POST JSON | JWT | 4 |
| `/api/templates/perguntas[/{disc}]` | GET | — | 5 |

Reference completo: [docs/API.md](docs/API.md).

## Estrutura

```
orcabot/
├── frontend/                Vite + React 18 SPA
│   ├── src/
│   │   ├── pages/           Login, Dashboard, Project, Onboarding, Privacidade, SINAPI, TCPO
│   │   ├── components/      cadernos, chat, planilha, workspace, shared, ui
│   │   ├── hooks/           useAsk, useExtract, useSinapiMatch, useExport, useCotacoes, ...
│   │   ├── contexts/        AuthContext, ProjectContext
│   │   └── lib/             supabase client, format, utils
│   ├── tests/e2e/           Playwright smoke
│   └── playwright.config.ts
├── api/                     FastAPI (Vercel Python function)
│   ├── index.py             Entry — Vercel detecta ASGI
│   ├── routers/             ask, extract, dxf, sinapi, admin, cron, export, templates
│   ├── lib/                 supabase, auth (JWT|API_SECRET), cache, audit
│   ├── schemas/             Pydantic models
│   └── engines/             vision, dxf, sinapi, xlsx, memorial, bdi
├── supabase/migrations/     SQL migrations (timestamp-prefixed)
├── scripts/                 Data ingest SINAPI/TCPO (Python + TS scrapers)
├── docs/                    ARCHITECTURE, DEPLOY, DEV, MIGRATION, API, SCHEMA
├── vercel.json              Vercel deploy + crons
├── requirements.txt         Python deps
└── package.json             Scripts orquestração
```

## Tabs do projeto (frontend)

| Tab | Descrição |
| --- | --- |
| Planilha | EAP/WBS editável estilo Excel |
| Arquivos | Upload + lista PDFs/DXFs |
| Q&A Plantas | Perguntas livres aos PDFs (Sprint 1) |
| Extração | Vision schema-driven 5 disciplinas (Sprint 2) |
| DXF | Parser + viewer 3D (Sprint 2) |
| Cotações | CRUD cotações de mercado (Sprint 3) |
| Quantitativos | Lista de itens levantados |
| Propostas | Análise de propostas |
| Premissas | BDI, adm%, data base |
| Curva ABC | Ranking dos itens |

Header: **Excel rápido** (client-side), **XLSX + BDI** (servidor com 5 abas), **Memorial PDF** (Sprint 4).

## Ambiente / variáveis

Detalhes em [docs/DEPLOY.md](docs/DEPLOY.md). Resumo:

**Backend (Vercel function):**
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET`
- `ORCABOT_API_SECRET` (compat legado)
- `OPENAI_API_KEY` (obrigatório p/ ask, extract, sinapi/match)
- `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` (opcionais)
- `CRON_SECRET` (admin/cron)
- `CORS_ORIGINS` (default `*`)

**Frontend (Vite — VITE_*):**
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `VITE_ORCABOT_API_URL` (vazio em prod = same-origin)
- `VITE_ORCABOT_API_SECRET`

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — diagrama da stack, decisões, restrições
- [docs/DEPLOY.md](docs/DEPLOY.md) — Vercel project, env vars, smoke check, limites Hobby
- [docs/DEV.md](docs/DEV.md) — setup local, fluxo dev, convenções de commit
- [docs/API.md](docs/API.md) — referência completa dos endpoints com curl
- [docs/SCHEMA.md](docs/SCHEMA.md) — tabelas `ob_*`, RLS, RPCs, índices
- [docs/MIGRATION.md](docs/MIGRATION.md) — endpoints legados → novos (Sprint 0)

## License

MIT — ver [LICENSE](LICENSE).
