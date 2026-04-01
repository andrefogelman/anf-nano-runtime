---
name: pdf-pipeline
description: Process construction drawing PDFs — extract text, OCR scanned pages, classify page types, interpret dimensions/finishes via Claude Vision, and output structured JSON for budgeting agents.
allowed-tools: Bash(pdf-pipeline:*)
---

# PDF Pipeline

Container skill that processes construction PDF drawings into structured data.

## Usage

The pipeline is triggered by the orchestrator agent when a new `pdf_jobs` row
appears with `status = 'pending'`. It can also be invoked directly:

```bash
pdf-pipeline process --job-id <uuid>
```

## Stages

1. **Ingestion** — download PDF from Supabase Storage
2. **Extraction** — pdfjs-dist native text + PaddleOCR fallback
3. **Classification** — LLM classifies each page type
4. **Interpretation** — Claude Vision extracts dimensions, finishes, openings
5. **Structured Output** — validated JSON per page/environment

## Environment Variables

- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (injected by credential proxy)
- `ANTHROPIC_BASE_URL` — LLM proxy URL (e.g. http://localhost:8100)
- `ANTHROPIC_AUTH_TOKEN` — proxy auth token (injected by credential proxy)
