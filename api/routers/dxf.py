"""POST /api/dxf/{parse,areas,count,text} — DXF parser via ezdxf.

Sprint 2 implementação. Sprint 0 stub.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

router = APIRouter()


@router.post("/parse")
@router.post("/areas")
@router.post("/count")
@router.post("/text")
def dxf_stub() -> dict[str, str]:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="POST /api/dxf/* — implementação no Sprint 2.",
    )
