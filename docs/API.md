# API Reference — Orcamentista IA

Backend: FastAPI Python (Vercel function `api/index.py`).
Auth: `Authorization: Bearer <Supabase JWT>` na maioria; CRON_SECRET nos endpoints `/api/admin/*` e `/api/cron/*`.

## Healthz

### `GET /api/healthz`
Sem auth. Liveness probe.

```bash
curl https://orcabot-mu.vercel.app/api/healthz
# → {"status":"ok","service":"orcamentista-engine","version":"0.1.0"}
```

## `/api/ask` — Vision Q&A (Sprint 1)

### `POST /api/ask`
Pergunta livre sobre PDF de planta. Multipart:

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `pdf` | File | sim | ≤ 30 MB |
| `payload` | Form (JSON string) | sim | `PerguntaInput` serializado |

**`PerguntaInput`:**
```json
{
  "pergunta": "calcule o número de pontos de tomada",
  "variaveis": {"pe_direito_m": 2.60},
  "provider": "openai",       // openai | claude | google
  "model": null,
  "reasoning_effort": "medium", // low | medium | high
  "include_verification": false,
  "project_id": "uuid",
  "pdf_page_id": null
}
```

**Resposta `AskResult`:**
```json
{
  "resposta": {
    "valor_numerico": 24,
    "unidade": "pontos",
    "raciocinio": "Conto 4 tomadas baixas + 4 altas em cada quarto...",
    "confianca": 0.85,
    "observacoes": ""
  },
  "cache_hit": false,
  "custo_usd": 0.0421,
  "duracao_s": 28.3,
  "provider": "openai",
  "model": "gpt-5",
  "query_id": "uuid"
}
```

```bash
curl -X POST https://orcabot-mu.vercel.app/api/ask \
  -H "Authorization: Bearer $JWT" \
  -F "pdf=@CGTA_EX_06_Eletrica.pdf" \
  -F 'payload={"pergunta":"pontos de tomada?","provider":"openai"}'
```

## `/api/extract` — Vision schema-driven (Sprint 2)

### `POST /api/extract/{disciplina}`
`disciplina ∈ {arq, est, mep, acab, quadro}`.

| Campo | Tipo | Default | Notas |
|---|---|---|---|
| `pdf` | File | obrigatório | ≤ 30 MB |
| `provider` | Form | `openai` | |
| `reasoning_effort` | Form | `medium` | |
| `project_id` | Form | null | UUID; obrigatório se `save_quantitativos=true` |
| `save_quantitativos` | Form | false | Se true, popula `ob_quantitativos` com `needs_review=true` |

Resposta: `{disciplina, label, data, duracao_s, custo_usd, model_used, quantitativos_inseridos}`.

## `/api/dxf/*` — DXF parser (Sprint 2)

| Endpoint | Form fields | Resposta |
|---|---|---|
| `POST /api/dxf/parse` | `dxf` | layers + entidades + blocks |
| `POST /api/dxf/areas` | `dxf`, `layer_filter?` | áreas m² por layer (Shoelace) |
| `POST /api/dxf/count` | `dxf`, `block_name`, `layer_filter?` | contagem |
| `POST /api/dxf/text` | `dxf`, `layer_filter?` | TEXT/MTEXT com XY |

DXF ≤ 50 MB.

## `/api/sinapi/match` — SINAPI matcher (Sprint 3)

### `POST /api/sinapi/match`
```json
{
  "descricao": "demolição de paredes de alvenaria",
  "uf": "SP",
  "top_k": 10,
  "rerank_k": 3,
  "match_threshold": 0.4
}
```

Pipeline: `embedding (OpenAI text-embedding-3-small dim=384) → pgvector search_sinapi_chunks → gpt-5-mini rerank → enriquece preço por (codigo, uf)`.

Resposta:
```json
{
  "descricao": "...",
  "uf": "SP",
  "n_candidates": 10,
  "n_returned": 3,
  "results": [
    {
      "codigo": "97624",
      "titulo": "DEMOLIÇÃO DE ALVENARIA DE TIJOLO MACIÇO...",
      "motivo": "Aderente ao serviço pois...",
      "similarity": 0.823,
      "preco": {
        "codigo": "97624",
        "descricao": "...",
        "unidade": "M3",
        "uf": "SP",
        "data_base": "2024-12",
        "custo_com_desoneracao": 129.15,
        "custo_sem_desoneracao": 152.46
      }
    }
  ]
}
```

## `/api/admin/*` — Admin (Sprint 3)

Auth: `Authorization: Bearer ${CRON_SECRET}` ou `?secret=...`.

### `POST /api/admin/sinapi/reembed?offset=0&limit=500`
Re-embeda chunks SINAPI em batch. Devolve `{processed, next_offset}`. Loop até `next_offset=null`.

### `GET /api/admin/sinapi/reembed/status`
Métricas + instruções.

## `/api/cron/*` — Cron jobs (Sprint 3)

Vercel chama via `crons[]` em `vercel.json` com `Authorization: Bearer ${CRON_SECRET}`.

### `GET /api/cron/sinapi/refresh`
Refresh mensal SINAPI (stub Sprint 3, implementação Sprint 4).

## `/api/export/*` — Export (Sprint 4)

### `POST /api/export/bdi/calc`
Preview BDI sem gerar arquivo. Body: `BdiInput` (lucro_pct, despesas_indiretas_pct, risco_pct, despesas_financeiras_pct, iss_pct, pis_pct, cofins_pct, irpj_pct, csll_pct).

### `POST /api/export/xlsx`
```json
{ "project_id": "uuid", "bdi": { ... } }
```
Resposta binária `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. 5 abas: Resumo, Planilha, BDI, Levantamento, Curva ABC.

### `POST /api/export/memorial`
```json
{ "project_id": "uuid" }
```
Resposta binária `application/pdf`. A4, com cada item rastreado (qty + memorial + fonte + custo + origem).

## `/api/templates/*` — Catálogo (Sprint 5)

### `GET /api/templates/perguntas`
Sem auth. Lista de perguntas sugeridas por disciplina (arq, ele, hid, demo, est, acab).

### `GET /api/templates/perguntas/{disciplina}`
Sugestões de uma disciplina. 404 se chave inválida.

## Auth + audit

- **JWT Supabase** (HS256, audience=`authenticated`) validado via `SUPABASE_JWT_SECRET`.
- `require_user_jwt` resolve `org_id` via `ob_org_members`.
- Endpoints sensíveis (export, sinapi/match, admin/*, cron/*) registram em `ob_audit_log` com user_id, org_id, action, target_id e metadata.

## Códigos HTTP padronizados

| Code | Quando |
|---|---|
| 200 | OK |
| 400 | Payload inválido (JSON malformado, schema violado, disciplina inexistente, DXF inválido) |
| 401 | JWT ausente/inválido OU CRON_SECRET inválido |
| 404 | Recurso não existe (ex: project_id) |
| 413 | Upload acima do limite (PDF > 30MB, DXF > 50MB) |
| 500 | Erro interno (logado) |
| 502 | Provider externo falhou (OpenAI, Anthropic, Google) |
| 503 | Env var faltando (OPENAI_API_KEY, CRON_SECRET) |
