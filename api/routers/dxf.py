"""POST /api/dxf/{parse,areas,count,text} — DXF parser via ezdxf (Sprint 2)."""
from __future__ import annotations

import logging
import tempfile
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from ..engines.dxf import closed_polyline_areas, count_blocks, extract_text, parse_dxf
from ..lib.auth import require_user_jwt

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_DXF_BYTES = 50 * 1024 * 1024  # 50MB


@router.post("/parse")
async def dxf_parse_endpoint(
    dxf: UploadFile = File(...),
    auth: dict[str, Any] = Depends(require_user_jwt),
) -> dict[str, Any]:
    path = await _save_temp(dxf)
    try:
        return parse_dxf(path)
    except Exception as exc:
        logger.exception("ezdxf parse falhou")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"DXF inválido: {exc}",
        ) from exc
    finally:
        path.unlink(missing_ok=True)


@router.post("/areas")
async def dxf_areas_endpoint(
    dxf: UploadFile = File(...),
    layer_filter: str | None = Form(None),
    auth: dict[str, Any] = Depends(require_user_jwt),
) -> dict[str, Any]:
    path = await _save_temp(dxf)
    try:
        results = closed_polyline_areas(path, layer_filter)
        return {"layer_filter": layer_filter, "results": results}
    except Exception as exc:
        logger.exception("ezdxf areas falhou")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"DXF inválido: {exc}",
        ) from exc
    finally:
        path.unlink(missing_ok=True)


@router.post("/count")
async def dxf_count_endpoint(
    dxf: UploadFile = File(...),
    block_name: str = Form(..., description="Nome exato do block (case-sensitive)"),
    layer_filter: str | None = Form(None),
    auth: dict[str, Any] = Depends(require_user_jwt),
) -> dict[str, Any]:
    path = await _save_temp(dxf)
    try:
        return count_blocks(path, block_name, layer_filter)
    except Exception as exc:
        logger.exception("ezdxf count falhou")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"DXF inválido: {exc}",
        ) from exc
    finally:
        path.unlink(missing_ok=True)


@router.post("/text")
async def dxf_text_endpoint(
    dxf: UploadFile = File(...),
    layer_filter: str | None = Form(None),
    auth: dict[str, Any] = Depends(require_user_jwt),
) -> dict[str, Any]:
    path = await _save_temp(dxf)
    try:
        items = extract_text(path, layer_filter)
        return {"layer_filter": layer_filter, "n_items": len(items), "items": items}
    except Exception as exc:
        logger.exception("ezdxf text falhou")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"DXF inválido: {exc}",
        ) from exc
    finally:
        path.unlink(missing_ok=True)


async def _save_temp(dxf: UploadFile) -> Path:
    data = await dxf.read()
    if len(data) > MAX_DXF_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"DXF maior que {MAX_DXF_BYTES // (1024 * 1024)}MB",
        )
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="DXF vazio",
        )
    with tempfile.NamedTemporaryFile(suffix=".dxf", delete=False) as tmp:
        tmp.write(data)
        return Path(tmp.name)
