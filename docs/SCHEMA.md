# Database Schema — Orcamentista IA

Supabase Postgres 17 (sa-east-1, project `baebsednxclzqukzxkbg`).
Schema **`public`** com prefixo **`ob_*`** pra isolar do banco compartilhado.

Todas as tabelas têm RLS habilitada e seguem o padrão multi-tenant via `ob_org_members.user_id = auth.uid()`.

## Tenancy

### `ob_organizations`
Empresas/escritórios. Owner cria a org no onboarding.

### `ob_org_members`
- `user_id` → `auth.users`
- `org_id` → `ob_organizations`
- `role` text — `owner | admin | member`

Padrão RLS típico:
```sql
WHERE org_id IN (SELECT org_id FROM ob_org_members WHERE user_id = auth.uid())
```

## Projetos e arquivos

### `ob_projects`
- `name`, `description`, `tipo_obra`, `area_total_m2`
- `uf`, `cidade`, `data_base_sinapi`
- `bdi_percentual`, `status` (draft|processing|review|done)
- `premissas` jsonb

### `ob_project_files`
- `storage_path` (bucket `project-pdfs`)
- `filename`, `file_type` (pdf|dwg|dxf|xlsx)
- `disciplina` (arq|est|hid|ele|memorial|null)
- `status` (uploaded|processing|done|error)

### `ob_pdf_pages`
- `file_id` → `ob_project_files`
- `page_number`, `prancha_id`, `tipo`, `text_content`, `ocr_used`
- `image_path`, `structured_data` jsonb
- `confidence` numeric(4,3), `needs_review` boolean

### `ob_pdf_jobs`
- Status assíncrono de pipelines de PDF (legacy NanoClaw, ainda referenciado)

## Quantitativos e orçamento

### `ob_quantitativos`
Saída do levantamento (vision/DXF/manual).
- `disciplina`, `item_code`, `descricao`, `unidade`, `quantidade`
- `calculo_memorial` text — explicação do cálculo
- `origem_prancha` uuid, `origem_ambiente` text
- `confidence`, `needs_review`, `created_by`, `reviewed_by`

### `ob_orcamento_items`
EAP/WBS hierárquica.
- `eap_code` text, `eap_level` int
- `descricao`, `unidade`, `quantidade`
- `fonte` (sinapi|tcpo|cotacao|manual), `fonte_codigo`, `fonte_data_base`
- `custo_unitario`, `custo_material`, `custo_mao_obra`, `custo_total`
- `adm_percentual`, `peso_percentual`, `curva_abc_classe` (A|B|C)
- `quantitativo_id` → `ob_quantitativos`

## Bases de preço

### `ob_sinapi_composicoes`
- `codigo` (5-6 dígitos), `descricao`, `unidade`, `uf`, `data_base`
- `custo_com_desoneracao`, `custo_sem_desoneracao`

### `ob_sinapi_composicao_insumos`
Decomposição (insumo → composição).

### `ob_sinapi_chunks`
Chunks dos cadernos técnicos pra RAG.
- `source_file`, `source_title`, `page_number`, `content`
- `embedding` vector(384) — OpenAI `text-embedding-3-small` dim=384 (Sprint 3)

### `ob_tcpo_composicoes` + `ob_tcpo_insumos`
Base TCPO (Tabela de Composições de Preços para Obras).

### `ob_cotacoes_mercado` (Sprint 3)
Cotações livres por projeto.
- `project_id`, `descricao`, `unidade`, `valor_unitario`, `fornecedor`, `validade`, `observacoes`

## IA — cache e histórico

### `ob_vision_cache` (Sprint 0)
Cache idempotente de respostas vision.
- UNIQUE `(pdf_sha256, question_hash)`
- `resposta` jsonb, `hit_count`, `accessed_at`
- `org_id` (RLS scope)

### `ob_vision_queries` (Sprint 0)
Log completo de cada call `/api/ask`.
- `pergunta`, `variaveis`, `provider`, `model`, `reasoning_effort`
- `resposta` jsonb, `cache_hit`, `custo_usd`, `duracao_s`

## Cross-checks (Sprint 2)

### `ob_cross_checks`
Comparação vision vs DXF determinístico.
- `metric`, `vision_value`, `dxf_value`
- `diff_percent` GENERATED, `flagged` GENERATED (>10%)

## Audit / LGPD (Sprint 5)

### `ob_audit_log`
Registro de ações sensíveis.
- `user_id`, `org_id`, `action` (dot-path: `export.xlsx`, `sinapi.match`, etc.)
- `target_type`, `target_id`, `metadata` jsonb
- `ip`, `user_agent`

## Funções RPC

### `search_sinapi_chunks(query_embedding vector(384), match_threshold float, match_count int)`
pgvector cosine similarity. Retorna chunks ranked por similaridade.

### `atualizar_curva_abc(p_project_id uuid)` (Sprint 4)
Window function recalcula `peso_percentual` + `curva_abc_classe` (A ≤80%, B ≤95%, C resto).

### `renumber_eap_items(...)`
Renumera códigos EAP em cascade (já existia pré-Sprint 0).

## Índices úteis

- `ob_audit_log`: `(org_id, created_at DESC)`, `(user_id, created_at DESC)`, `(action, created_at DESC)`
- `ob_vision_cache`: `(pdf_sha256, question_hash)`, parcial `(org_id) WHERE org_id IS NOT NULL`
- `ob_vision_queries`: `(project_id, created_at DESC)`
- `ob_cross_checks`: `(project_id, created_at DESC)`, parcial `(project_id) WHERE flagged=true`

## Storage buckets

- **`project-pdfs`** — PDFs e DXFs dos projetos
- **`sinapi-cadernos`** — PDFs públicos dos cadernos técnicos SINAPI
- **`templates`** — templates xlsx (futuro)

## Migrations

Em `supabase/migrations/`. Padrão `YYYYMMDDhhmmss_descricao.sql`. Aplicar via:

```bash
# CLI (recomendado pra dev local)
supabase db push

# OU via MCP (execução remota direta — usado neste projeto):
# mcp__claude_ai_Supabase__apply_migration
```

⚠️ **Não modifique migrations antigas** — só adicione novas com timestamp maior.
