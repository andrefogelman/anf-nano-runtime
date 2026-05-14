"""POST /api/extract — Vision schema-driven (5 disciplinas: arq, est, MEP, acab, quadro).

Sprint 2 implementação. Sprint 0 stub.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

router = APIRouter()


@router.post("")
@router.post("/")
def extract_stub() -> dict[str, str]:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="POST /api/extract — implementação no Sprint 2.",
    )
