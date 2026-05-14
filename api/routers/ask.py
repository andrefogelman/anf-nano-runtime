"""POST /api/ask — Vision Q&A livre sobre PDF de planta.

Sprint 1: implementação completa com gaik VisionExtractor + cache + log.
Sprint 0: stub 501.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

router = APIRouter()


@router.post("")
@router.post("/")
def ask_stub() -> dict[str, str]:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="POST /api/ask — implementação no Sprint 1.",
    )
