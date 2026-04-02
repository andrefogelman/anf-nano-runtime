---
name: dwg-pipeline
description: Process DWG/DXF construction drawings — convert DWG to DXF via LibreDWG, extract geometric entities via ezdxf (Python), classify layers, map blocks, and output structured JSON for budgeting agents.
allowed-tools: Bash(dwg-pipeline:*)
---

# DWG Pipeline

Container skill that processes DWG/DXF construction drawings into structured data.

## Usage

The pipeline is triggered by the orchestrator when a new `ob_pdf_jobs` row
appears for a DWG/DXF file with `status = 'pending'`. It can also be invoked directly:

```bash
dwg-pipeline process --job-id <uuid>
```

## Stages

1. **Ingestion** — download file from Supabase Storage
2. **Conversion** — DWG to DXF via LibreDWG `dwg2dxf` (skipped for DXF files)
3. **Extraction** — ezdxf parses layers, entities, blocks, dimensions, texts
4. **Classification** — 3-step layer classification (regex, content, LLM)
5. **Structured Output** — validated JSON per page/environment (same schema as PDF pipeline)

## Environment Variables

- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (injected by credential proxy)
- `ANTHROPIC_BASE_URL` — LLM proxy URL (e.g. http://localhost:8100)
- `ANTHROPIC_AUTH_TOKEN` — proxy auth token (injected by credential proxy)
