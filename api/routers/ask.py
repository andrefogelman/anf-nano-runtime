"""POST /api/ask — Vision Q&A livre sobre PDF de planta (Sprint 1).

Multipart upload:
  - `pdf`: arquivo PDF (≤ 30MB)
  - `payload`: JSON string com PerguntaInput

Fluxo:
  1. Valida JSON payload + PDF size.
  2. Hash (pdf_sha256, question_hash) → procura cache em ob_vision_cache.
  3. Cache miss: roda gaik VisionExtractor (~30s p/ reasoning_effort=medium).
  4. Persiste resposta no cache (escopo org/project) + log em ob_vision_queries.
  5. Devolve AskResult com cache_hit, custo_usd, duracao_s, query_id.
"""
from __future__ import annotations

import json
import logging
import tempfile
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import ValidationError

from ..engines.vision import hash_pdf, hash_question, run_vision
from ..lib.auth import require_user_jwt
from ..lib.cache import get_cached, put_cache
from ..lib.supabase import get_supabase
from ..schemas.ask import AskResult, PerguntaInput, RespostaOutput

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_PDF_BYTES = 30 * 1024 * 1024  # 30MB


@router.post("", response_model=AskResult)
@router.post("/", response_model=AskResult, include_in_schema=False)
async def ask(
    pdf: UploadFile = File(..., description="PDF da planta (≤ 30MB)"),
    payload: str = Form(..., description="JSON serializado de PerguntaInput"),
    auth: dict[str, Any] = Depends(require_user_jwt),
) -> AskResult:
    parsed = _parse_payload(payload)
    pdf_bytes = await _read_pdf(pdf)

    pdf_sha = hash_pdf(pdf_bytes)
    q_hash = hash_question(parsed)

    cached_resp = get_cached(pdf_sha, q_hash)
    if cached_resp is not None:
        resposta = RespostaOutput(**cached_resp)
        query_id = _log_query(
            auth=auth,
            payload=parsed,
            resposta=resposta,
            cache_hit=True,
            custo_usd=0.0,
            duracao_s=0.0,
            provider=parsed.provider,
            model=parsed.model or "cached",
        )
        return AskResult(
            resposta=resposta,
            cache_hit=True,
            custo_usd=0.0,
            duracao_s=0.0,
            provider=parsed.provider,
            model=parsed.model or "cached",
            query_id=query_id,
        )

    tmp_path = _write_temp_pdf(pdf_bytes)
    try:
        resposta, meta = run_vision(tmp_path, parsed)
    except Exception as exc:
        logger.exception("vision extractor falhou")
        # Inclui tipo da exception pra ajudar a diagnosticar (e.g.,
        # RateLimitError, AuthenticationError, BadRequestError, APITimeoutError, etc.)
        exc_type = type(exc).__name__
        exc_msg = str(exc)[:500]  # trunca mensagens muito longas
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"vision provider falhou ({exc_type}): {exc_msg}",
        ) from exc
    finally:
        tmp_path.unlink(missing_ok=True)

    put_cache(
        pdf_sha,
        q_hash,
        resposta.model_dump(),
        org_id=auth.get("org_id"),
        project_id=parsed.project_id,
    )
    query_id = _log_query(
        auth=auth,
        payload=parsed,
        resposta=resposta,
        cache_hit=False,
        custo_usd=meta["custo_usd"],
        duracao_s=meta["duracao_s"],
        provider=meta["provider"],
        model=meta["model"],
    )

    return AskResult(
        resposta=resposta,
        cache_hit=False,
        custo_usd=meta["custo_usd"],
        duracao_s=meta["duracao_s"],
        provider=meta["provider"],
        model=meta["model"],
        query_id=query_id,
    )


def _parse_payload(payload: str) -> PerguntaInput:
    try:
        raw = json.loads(payload)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"payload não é JSON válido: {exc}",
        ) from exc
    try:
        return PerguntaInput(**raw)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"payload inválido: {exc.errors()}",
        ) from exc


async def _read_pdf(pdf: UploadFile) -> bytes:
    data = await pdf.read()
    if len(data) > MAX_PDF_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"PDF maior que {MAX_PDF_BYTES // (1024 * 1024)}MB",
        )
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PDF vazio",
        )
    return data


def _write_temp_pdf(pdf_bytes: bytes) -> Path:
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(pdf_bytes)
        return Path(tmp.name)


def _log_query(
    *,
    auth: dict[str, Any],
    payload: PerguntaInput,
    resposta: RespostaOutput,
    cache_hit: bool,
    custo_usd: float,
    duracao_s: float,
    provider: str,
    model: str | None,
) -> str:
    """Insere uma linha em ob_vision_queries e devolve o id (uuid) gerado."""
    sb = get_supabase()
    query_id = str(uuid.uuid4())
    row: dict[str, Any] = {
        "id": query_id,
        "project_id": payload.project_id,
        "pdf_page_id": payload.pdf_page_id,
        "user_id": auth.get("user_id"),
        "pergunta": payload.pergunta,
        "variaveis": payload.variaveis,
        "provider": provider,
        "model": model,
        "reasoning_effort": payload.reasoning_effort,
        "resposta": resposta.model_dump(),
        "cache_hit": cache_hit,
        "custo_usd": custo_usd,
        "duracao_s": duracao_s,
    }
    try:
        sb.table("ob_vision_queries").insert(row).execute()
    except Exception:
        # log persiste é "best effort"; falha aqui não deve quebrar a resposta
        logger.exception("falha ao logar ob_vision_queries (response segue)")
    return query_id
