"""Endpoints administrativos protegidos por CRON_SECRET (Sprint 3).

POST /api/admin/sinapi/reembed?offset=0&limit=500
   Re-embeda chunks SINAPI com OpenAI text-embedding-3-small dim=384.
   Paginar manualmente até `next_offset == None` (Vercel Hobby 60s).

GET  /api/admin/sinapi/reembed/status
   Retorna métricas: total, com embedding antigo, com embedding novo (heurística
   por timestamp updated_at se disponível).

Auth: header `Authorization: Bearer <CRON_SECRET>` ou query `?secret=...`.
"""
from __future__ import annotations

import logging
import os
import time
from typing import Annotated, Any

from fastapi import APIRouter, Header, HTTPException, Query, status

from ..engines.sinapi import EMBEDDING_DIM, embed_batch
from ..lib.supabase import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter()

# Tempo máximo gasto em uma chamada antes de devolver pra usuário (Vercel Hobby = 60s).
MAX_CALL_SECONDS = 50.0
# Tamanho do sub-batch enviado ao OpenAI (até 2048 inputs por call são suportados).
OPENAI_BATCH_SIZE = 100


def _require_cron_secret(
    authorization: Annotated[str | None, Header()] = None,
    secret: Annotated[str | None, Query()] = None,
) -> None:
    expected = os.environ.get("CRON_SECRET")
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRON_SECRET não configurada no ambiente",
        )
    token: str | None = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    if not token and secret:
        token = secret
    if token != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="CRON_SECRET inválido",
        )


@router.post("/sinapi/reembed")
def sinapi_reembed(
    offset: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=2000),
    authorization: Annotated[str | None, Header()] = None,
    secret: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    """Re-embeda em chunks de OPENAI_BATCH_SIZE até esgotar `limit` ou MAX_CALL_SECONDS.

    Resposta:
      - processed: quantos foram re-embedados nesta call
      - next_offset: chame com este offset pra continuar; None se acabou tudo
      - elapsed_s
    """
    _require_cron_secret(authorization=authorization, secret=secret)

    sb = get_supabase()
    started = time.perf_counter()
    processed = 0
    cursor = offset

    while processed < limit:
        if time.perf_counter() - started > MAX_CALL_SECONDS:
            logger.info("reembed: time budget esgotado em offset=%s processed=%s", cursor, processed)
            break

        page_size = min(OPENAI_BATCH_SIZE, limit - processed)
        rows = (
            sb.table("ob_sinapi_chunks")
            .select("id, content")
            .order("id")
            .range(cursor, cursor + page_size - 1)
            .execute()
        )
        batch = rows.data or []
        if not batch:
            # acabou
            return {
                "processed": processed,
                "next_offset": None,
                "elapsed_s": round(time.perf_counter() - started, 2),
                "embedding_model": "text-embedding-3-small",
                "embedding_dim": EMBEDDING_DIM,
            }

        texts = [(r.get("content") or "")[:8000] for r in batch]
        try:
            embeddings = embed_batch(texts)
        except Exception as exc:
            logger.exception("OpenAI embed_batch falhou em offset=%s", cursor)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"embed_batch falhou: {exc}",
            ) from exc

        for row, emb in zip(batch, embeddings, strict=True):
            sb.table("ob_sinapi_chunks").update({"embedding": emb}).eq("id", row["id"]).execute()

        processed += len(batch)
        cursor += len(batch)

        if len(batch) < page_size:
            # última página
            return {
                "processed": processed,
                "next_offset": None,
                "elapsed_s": round(time.perf_counter() - started, 2),
                "embedding_model": "text-embedding-3-small",
                "embedding_dim": EMBEDDING_DIM,
            }

    return {
        "processed": processed,
        "next_offset": cursor,
        "elapsed_s": round(time.perf_counter() - started, 2),
        "embedding_model": "text-embedding-3-small",
        "embedding_dim": EMBEDDING_DIM,
    }


@router.get("/sinapi/reembed/status")
def sinapi_reembed_status(
    authorization: Annotated[str | None, Header()] = None,
    secret: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    _require_cron_secret(authorization=authorization, secret=secret)
    sb = get_supabase()
    res = (
        sb.table("ob_sinapi_chunks")
        .select("id", count="exact")
        .execute()
    )
    return {
        "total_chunks": res.count or 0,
        "expected_embedding_dim": EMBEDDING_DIM,
        "embedding_model": "text-embedding-3-small",
        "note": (
            "Para re-embedar tudo, chame POST /api/admin/sinapi/reembed?offset=0&limit=500 "
            "em loop com next_offset retornado até next_offset==None. "
            "13.597 chunks ≈ 27 chamadas, ~$1.36."
        ),
    }
