# Deploy — Orcamentista IA (Vercel)

## Projeto Vercel

- **Project ID:** `prj_GWZ4A9iROB1e0YLlXexOuyaxhSyp`
- **Org ID:** `team_yxtlJCBAJJEgrXZcS1JatswZ`
- **Plano:** Hobby ($0)
- **Linked:** sim (`.vercel/project.json` no repo)

## Variáveis de ambiente

Configurar no dashboard Vercel (Production + Preview + Development), ou via `vercel env add`:

### Backend (FastAPI Python function)

| Var                     | Origem                                    | Notas                          |
| ----------------------- | ----------------------------------------- | ------------------------------ |
| `SUPABASE_URL`          | Supabase project Settings → API → URL     | `https://baebsednxclzqukzxkbg.supabase.co` |
| `SUPABASE_ANON_KEY`     | Supabase Settings → API → anon public key | OK ser pública                 |
| `SUPABASE_SERVICE_KEY`  | Supabase Settings → API → service role    | **Secreto** — nunca no frontend |
| `SUPABASE_JWT_SECRET`   | Supabase Settings → API → JWT secret      | Validar JWT no FastAPI         |
| `ORCABOT_API_SECRET`    | `openssl rand -hex 32`                    | Bearer compat com frontend legado |
| `OPENAI_API_KEY`        | OpenAI dashboard                          | Sprint 1+                      |
| `ANTHROPIC_API_KEY`     | Anthropic console                         | Opcional (alt provider)        |
| `GOOGLE_API_KEY`        | Google AI Studio                          | Opcional (alt provider)        |
| `CORS_ORIGINS`          | (opcional, default `*`)                   | Comma-separated, tighten p/ beta |

### Frontend (Vite — variáveis VITE_*)

| Var                          | Notas                                                  |
| ---------------------------- | ------------------------------------------------------ |
| `VITE_SUPABASE_URL`          | Mesma URL do backend                                   |
| `VITE_SUPABASE_ANON_KEY`     | Mesma anon key                                         |
| `VITE_ORCABOT_API_URL`       | Vazio em produção (mesmo domínio Vercel)               |
| `VITE_ORCABOT_API_SECRET`    | Mesmo valor de `ORCABOT_API_SECRET`                    |

## Build

`vercel.json` raiz:

```json
{
  "buildCommand": "cd frontend && bun install && bun run build",
  "outputDirectory": "frontend/dist",
  "installCommand": "echo 'no root install'",
  "framework": null,
  "functions": {
    "api/index.py": {
      "runtime": "@vercel/python@5.x",
      "maxDuration": 60,
      "memory": 1024
    }
  },
  "rewrites": [
    { "source": "/api/(.*)",      "destination": "/api/index.py" },
    { "source": "/((?!api/).*)",  "destination": "/index.html" }
  ]
}
```

## Limites Vercel Hobby

| Limite       | Valor    | Mitigação                                                                    |
| ------------ | -------- | ---------------------------------------------------------------------------- |
| maxDuration  | 60s      | Default `reasoning_effort="medium"` (~30s). `"high"` opt-in com aviso.      |
| Bundle       | 250MB    | ~150MB esperado. `sentence-transformers` é o peso pesado.                   |
| Memory       | 1024MB   | gaik vision pico ~400MB.                                                     |
| Invocations  | 100k/mês | Suficiente pra beta.                                                         |

Se estourar 60s consistentemente: upgrade Pro ($20/mês) destrava 300s via Fluid Compute.

## Smoke check (após cada push)

```bash
# 1. Frontend builda?
curl -sI https://<preview-url> | head -1   # → HTTP/2 200

# 2. Backend healthz?
curl -s https://<preview-url>/api/healthz | jq
# → {"status":"ok","service":"orcamentista-engine","version":"0.1.0"}

# 3. Stub endpoints retornam 501?
curl -s -X POST https://<preview-url>/api/ask -H "Authorization: Bearer $ORCABOT_API_SECRET"
# → {"detail":"POST /api/ask — implementação no Sprint 1."}
```

## Migrations Supabase

Aplicar via MCP `apply_migration` (preferido neste projeto) ou Supabase CLI:

```bash
# CLI
supabase link --project-ref baebsednxclzqukzxkbg
supabase db push
```

Histórico em `supabase/migrations/` — sempre adicionar com timestamp **maior** que a última.
Última: `20260410000002_vision_cache_and_queries.sql` (Sprint 0).
