"""POST /api/sinapi/match — descrição → top-K composições SINAPI (Sprint 3).

Pipeline em api/engines/sinapi.py: OpenAI embedding → pgvector RPC → LLM rerank
→ enriquece preço por UF.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from ..engines.sinapi import search_sinapi
from ..lib.auth import require_user_jwt

logger = logging.getLogger(__name__)
router = APIRouter()


class SinapiMatchInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    descricao: str = Field(min_length=3, max_length=500)
    uf: str = Field(default="SP", min_length=2, max_length=2, description="UF para enriquecer preço")
    top_k: int = Field(default=10, ge=1, le=50, description="Quantos chunks pra vector search")
    rerank_k: int = Field(default=3, ge=1, le=10, description="Quantos retornar após rerank LLM")
    match_threshold: float = Field(default=0.4, ge=0.0, le=1.0, description="Similaridade mínima cosine")


@router.post("/match")
def sinapi_match(
    payload: SinapiMatchInput,
    auth: dict[str, Any] = Depends(require_user_jwt),  # noqa: ARG001
) -> dict[str, Any]:
    try:
        result = search_sinapi(
            descricao=payload.descricao,
            uf=payload.uf.upper(),
            top_k=payload.top_k,
            rerank_k=payload.rerank_k,
            match_threshold=payload.match_threshold,
        )
    except RuntimeError as exc:
        # OPENAI_API_KEY missing
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("sinapi match falhou")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"upstream falhou: {exc}",
        ) from exc

    return {
        "descricao": payload.descricao,
        "uf": payload.uf.upper(),
        **result,
    }
