# Migração — Endpoints NanoClaw → FastAPI

> Status Sprint 0: backend NanoClaw foi removido (`src/`, `agents/`, `container/`).
> Frontend continua chamando os endpoints antigos (vão dar 404 até Sprint 1+).

## Endpoints atuais (chamados pelo frontend)

| Endpoint legado            | Arquivo do frontend                                      | Método | Status pós-Sprint 0 |
| -------------------------- | -------------------------------------------------------- | ------ | ------------------- |
| `/api/process`             | `frontend/src/components/pdf/PdfProcessPanel.tsx:365`    | POST   | 404 (legado)        |
| `/api/agent-chat`          | `frontend/src/hooks/useAgentChat.ts:59`                  | POST   | 404 (legado)        |
| `/api/caderno-query`       | `frontend/src/hooks/useCadernos.ts:79`                   | POST   | 404 (legado)        |

Base URL: `import.meta.env.VITE_ORCABOT_API_URL` (default: produção `https://orcabot-api.anfconstrucoes.com`).

Auth: `Authorization: Bearer ${VITE_ORCABOT_API_SECRET}`.

## Endpoints novos (FastAPI — Sprints 1+)

| Endpoint novo              | Sprint | Substitui          | Diferenças                                                 |
| -------------------------- | ------ | ------------------ | ---------------------------------------------------------- |
| `GET  /api/healthz`        | 0      | —                  | Sem auth. Liveness probe.                                  |
| `POST /api/ask`            | 1      | (parcial) `/api/process`, `/api/agent-chat` | Vision Q&A livre, schema RespostaOutput, cache + log.      |
| `POST /api/extract`        | 2      | (parcial) `/api/process` | Vision schema-driven (5 disciplinas: arq, est, MEP, acab, quadro). |
| `POST /api/dxf/parse`      | 2      | (novo)             | Lista layers e entidades.                                  |
| `POST /api/dxf/areas`      | 2      | (novo)             | Polylines fechadas via Shoelace, agrupa por layer.         |
| `POST /api/dxf/count`      | 2      | (novo)             | Contagem de blocks.                                        |
| `POST /api/dxf/text`       | 2      | (novo)             | Extração de texto/cotas.                                   |
| `POST /api/sinapi/match`   | 3      | `/api/caderno-query` | Embedding 384-dim → search_sinapi_chunks RPC → LLM rerank. |
| `POST /api/xlsx/render`    | 4      | (novo)             | Export planilha ANF + memorial PDF + curva ABC.            |

## Mapeamento por página

| Página                                | Endpoint legado          | Endpoint novo                                                   | Sprint |
| ------------------------------------- | ------------------------ | --------------------------------------------------------------- | ------ |
| `AssistenteSinapiPage.tsx`            | `/api/caderno-query`     | `/api/sinapi/match`                                              | 3      |
| `SinapiPage.tsx`                      | (Supabase direto)        | (mantém Supabase direto)                                         | —      |
| `CadernosPage.tsx`                    | (Supabase direto)        | (mantém Supabase direto, ou `/api/sinapi/match` se quiser RAG)   | 3      |
| `ProjectPage.tsx` + chat sidebar      | `/api/agent-chat`        | `<PerguntaPlantaPanel />` novo, calls `/api/ask`                 | 1      |
| `ProjectPage.tsx` + PdfProcessPanel   | `/api/process`           | `/api/extract` (schema-driven por disciplina)                    | 2      |
| `TcpoPage.tsx`, `TcpoInsumosPage.tsx` | (Supabase direto)        | (mantém Supabase direto)                                         | —      |
| `DashboardPage.tsx`                   | (Supabase direto)        | (mantém Supabase direto)                                         | —      |

## Auth — transição

Sprint 0:
- `api/lib/auth.py` aceita **ambos** os tokens:
  - `ORCABOT_API_SECRET` (Bearer compartilhado, mesmo formato do legado)
  - Supabase JWT (para clients novos que já têm session)

Sprint 1+: migrar gradualmente o frontend pra mandar JWT em vez do API_SECRET, removendo a aceitação de API_SECRET no Sprint 5.
