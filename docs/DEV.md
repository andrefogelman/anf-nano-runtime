# Desenvolvimento local — Orcamentista IA

## Pré-requisitos

- Node.js ≥20 (recomendado: 22 LTS)
- Bun ≥1.1 (`curl -fsSL https://bun.sh/install | bash`)
- Python ≥3.11 (Vercel runtime é 3.13; localmente qualquer 3.11+ serve)
- Supabase CLI (opcional — pra `db push` local)

## Setup

```bash
git clone https://github.com/andrefogelman/orcabot.git
cd orcabot
git checkout feat/restart-no-nanoclaw
cp .env.example .env
# editar .env com keys reais (ver docs/DEPLOY.md)
```

## Frontend (Vite + React)

```bash
cd frontend
bun install
bun run dev          # http://localhost:5173 (default Vite)
bun run typecheck    # tsc --noEmit
bun run build        # output em frontend/dist/
```

Atalho da raiz: `bun run dev:web`.

## Backend (FastAPI Python)

```bash
# venv local (recomendado)
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# rodar
uvicorn api.index:app --reload --port 3001
# API em http://localhost:3001/api/healthz
```

Atalho da raiz: `bun run dev:api` (assume `.venv` ativada e `uvicorn` no PATH).

## Rodar frontend + backend simultaneamente

Em dois terminais:

```bash
# terminal 1
bun run dev:web      # :5173

# terminal 2
source .venv/bin/activate && bun run dev:api    # :3001
```

Configurar `frontend/.env.local`:
```
VITE_ORCABOT_API_URL=http://localhost:3001
VITE_ORCABOT_API_SECRET=<mesmo valor do .env raiz>
```

## Testar endpoints

```bash
# Healthz (sem auth)
curl http://localhost:3001/api/healthz

# Stub auth-protected (Sprint 1+)
TOKEN=$(grep ORCABOT_API_SECRET .env | cut -d= -f2)
curl -X POST http://localhost:3001/api/ask \
  -H "Authorization: Bearer $TOKEN"
# → 501 Not Implemented (esperado no Sprint 0)
```

## Migrations Supabase

```bash
# Adicionar nova migration
TIMESTAMP=$(date -u +%Y%m%d%H%M%S)
touch supabase/migrations/${TIMESTAMP}_descricao.sql

# Aplicar via Supabase CLI (precisa estar linkado)
supabase link --project-ref baebsednxclzqukzxkbg
supabase db push

# OU via MCP (preferido neste projeto):
# usar mcp__claude_ai_Supabase__apply_migration
```

⚠️ **Não modifique migrations antigas.** Só adicione novas com timestamp maior.

## Convenções de commit

`feat()`, `fix()`, `chore()`, `docs()` — escopo entre parênteses, descrição em pt-BR.

Exemplo:
```
feat(ask): implementa /api/ask com cache em ob_vision_cache

Sprint 1.

- gaik VisionExtractor com schema RespostaOutput
- cache by (pdf_sha256, question_hash)
- log em ob_vision_queries com custo + duração
```

## Estrutura de pastas

```
orcabot/
├── frontend/              # Vite + React 18 SPA
│   └── src/{pages,components,hooks,lib,contexts}/
├── api/                   # FastAPI Python (Vercel function)
│   ├── index.py           # entry
│   ├── routers/           # /api/ask, /extract, /dxf, /sinapi
│   ├── lib/               # supabase, auth, cache helpers
│   ├── schemas/           # Pydantic models
│   └── engines/           # vision/dxf/sinapi business logic
├── supabase/migrations/   # SQL migrations (timestamp-prefixed)
├── scripts/               # data ingest SINAPI/TCPO (Python + TS)
├── docs/                  # ARCHITECTURE, DEPLOY, DEV, MIGRATION
├── vercel.json            # Vercel deploy config
├── requirements.txt       # Python deps
└── package.json           # scripts orquestração (sem deps runtime)
```
