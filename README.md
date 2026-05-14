# Orcamentista IA

> SaaS multi-tenant pra escritórios brasileiros gerarem orçamento de obra a partir de pacote de projeto (PDFs + DXFs + escopo). IA assiste levantamento via Q&A em planta, matching SINAPI/TCPO, geração de planilha xlsx + memorial de cálculo.

[![Deploy on Vercel](https://img.shields.io/badge/deploy-vercel-black)](https://vercel.com)
[![Supabase](https://img.shields.io/badge/database-supabase-3FCF8E)](https://supabase.com)

---

## Stack

| Camada     | Tech                                                                       |
| ---------- | -------------------------------------------------------------------------- |
| Frontend   | Vite 5.4 + React 18.3 + Tailwind + shadcn/ui + TanStack Query              |
| Backend    | FastAPI (Python 3.13) — single Vercel function `api/index.py`              |
| Hosting    | Vercel Hobby (frontend estático + Python serverless function)              |
| Banco      | Supabase Postgres 17 (Auth + Storage + Realtime + pgvector)                |
| Vision LLM | gaik[vision-extract] multi-provider (OpenAI / Claude / Gemini)             |
| DXF        | ezdxf (Sprint 2)                                                           |
| Excel      | openpyxl (Sprint 4)                                                        |

## Quick start

```bash
git clone https://github.com/andrefogelman/orcabot.git
cd orcabot
cp .env.example .env   # editar com keys reais

# Frontend
cd frontend && bun install && bun run dev      # → http://localhost:5173

# Backend (em outro terminal)
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.index:app --reload --port 3001     # → http://localhost:3001/api/healthz
```

Detalhes em [docs/DEV.md](docs/DEV.md).

## Estrutura

```
orcabot/
├── frontend/              Vite + React 18 SPA (Login, Dashboard, Project, SINAPI, TCPO)
├── api/                   FastAPI (Vercel Python function)
│   ├── index.py           Entry — Vercel detecta ASGI
│   ├── routers/           /api/{ask,extract,dxf,sinapi}
│   ├── lib/               supabase, auth (JWT|API_SECRET), cache helpers
│   ├── schemas/           Pydantic models
│   └── engines/           vision/dxf/sinapi business logic
├── supabase/migrations/   SQL migrations (timestamp-prefixed)
├── scripts/               Data ingest SINAPI/TCPO (Python + TS scrapers)
├── docs/                  ARCHITECTURE, DEPLOY, DEV, MIGRATION
├── vercel.json            Vercel deploy config
├── requirements.txt       Python deps (FastAPI, gaik, ezdxf, openpyxl, supabase-py)
└── package.json           Scripts orquestração (sem deps runtime)
```

## Endpoints

| Rota                   | Sprint | Status (após Sprint 0) |
| ---------------------- | ------ | ---------------------- |
| `GET  /api/healthz`    | 0      | ✅ 200                  |
| `POST /api/ask`        | 1      | 🔧 stub 501             |
| `POST /api/extract`    | 2      | 🔧 stub 501             |
| `POST /api/dxf/*`      | 2      | 🔧 stub 501             |
| `POST /api/sinapi/match` | 3    | 🔧 stub 501             |
| `POST /api/xlsx/render`  | 4    | (a criar)              |

## Roadmap

| Sprint | Escopo                                          | Estimativa |
| ------ | ----------------------------------------------- | ---------- |
| 0      | Reset + bootstrap FastAPI + migration cache     | ~14h ✅    |
| 1      | `/api/ask` Vision Q&A + cache + log             | ~12h       |
| 2      | `/api/extract` schema + `/api/dxf/*`            | ~14h       |
| 3      | `/api/sinapi/match` (embedding + LLM rerank)    | ~12h       |
| 4      | `/api/xlsx/render` + memorial PDF + curva ABC   | ~10h       |
| 5      | Polish + onboarding + LGPD + Playwright E2E     | ~8h        |

Total: ~70h.

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — diagrama da stack, decisões, restrições.
- [docs/DEPLOY.md](docs/DEPLOY.md) — Vercel project, env vars, smoke check, limites Hobby.
- [docs/DEV.md](docs/DEV.md) — setup local, fluxo dev, convenções de commit.
- [docs/MIGRATION.md](docs/MIGRATION.md) — endpoints legados → novos endpoints FastAPI.

## License

MIT — ver [LICENSE](LICENSE).
