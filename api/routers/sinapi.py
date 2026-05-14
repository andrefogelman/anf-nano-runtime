"""POST /api/sinapi/match — descrição → embedding 384-dim → search_sinapi_chunks → LLM rerank.

Sprint 3 implementação. Sprint 0 stub.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

router = APIRouter()


@router.post("/match")
def sinapi_match_stub() -> dict[str, str]:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="POST /api/sinapi/match — implementação no Sprint 3.",
    )
