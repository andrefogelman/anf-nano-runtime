"""POST /api/dxf/{parse,areas,count,text} — DXF parser via ezdxf (Sprint 2).

Aceita 2 modos de upload:
  1. `dxf` (UploadFile multipart) — pra arquivos pequenos (<4MB, limite Vercel)
  2. `storage_path` (Form string) — frontend uploadou pra bucket `project-pdfs`
     antes; backend baixa via service-role. Sem limite de tamanho prático.

Storage path esperado: `tmp-dxf/<timestamp>-<filename>.dxf` (cleanup manual ou TTL).
"""
from __future__ import annotations

import logging
import tempfile
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from ..engines.dxf import closed_polyline_areas, count_blocks, extract_text, parse_dxf
from ..lib.auth import require_user_jwt
from ..lib.supabase import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_DXF_BYTES = 50 * 1024 * 1024  # 50MB
DXF_BUCKET = "project-pdfs"


@router.post("/parse")
async def dxf_parse_endpoint(
    dxf: UploadFile | None = File(None),
    storage_path: str | None = Form(None),
    auth: dict[str, Any] = Depends(require_user_jwt),
) -> dict[str, Any]:
    path = await _resolve_dxf(dxf, storage_path)
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
    dxf: UploadFile | None = File(None),
    storage_path: str | None = Form(None),
    layer_filter: str | None = Form(None),
    auth: dict[str, Any] = Depends(require_user_jwt),
) -> dict[str, Any]:
    path = await _resolve_dxf(dxf, storage_path)
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
    dxf: UploadFile | None = File(None),
    storage_path: str | None = Form(None),
    block_name: str = Form(..., description="Nome exato do block (case-sensitive)"),
    layer_filter: str | None = Form(None),
    auth: dict[str, Any] = Depends(require_user_jwt),
) -> dict[str, Any]:
    path = await _resolve_dxf(dxf, storage_path)
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
    dxf: UploadFile | None = File(None),
    storage_path: str | None = Form(None),
    layer_filter: str | None = Form(None),
    auth: dict[str, Any] = Depends(require_user_jwt),
) -> dict[str, Any]:
    path = await _resolve_dxf(dxf, storage_path)
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


async def _resolve_dxf(
    dxf: UploadFile | None, storage_path: str | None
) -> Path:
    """Materializa o DXF em arquivo temporário, vindo de upload OU Storage."""
    if dxf is None and not storage_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Forneça `dxf` (multipart) OU `storage_path` (string).",
        )
    if dxf is not None and storage_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Forneça apenas um: `dxf` OU `storage_path`.",
        )

    if storage_path:
        return _download_from_storage(storage_path)
    assert dxf is not None
    return await _save_temp_upload(dxf)


def _download_from_storage(storage_path: str) -> Path:
    """Baixa DXF do bucket project-pdfs via service-role."""
    if ".." in storage_path or storage_path.startswith("/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="storage_path inválido",
        )
    sb = get_supabase()
    try:
        data = sb.storage.from_(DXF_BUCKET).download(storage_path)
    except Exception as exc:
        logger.exception("storage download falhou: %s", storage_path)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"DXF não encontrado em storage: {storage_path}",
        ) from exc
    if len(data) > MAX_DXF_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"DXF maior que {MAX_DXF_BYTES // (1024 * 1024)}MB",
        )
    with tempfile.NamedTemporaryFile(suffix=".dxf", delete=False) as tmp:
        tmp.write(data)
        return Path(tmp.name)


async def _save_temp_upload(dxf: UploadFile) -> Path:
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
