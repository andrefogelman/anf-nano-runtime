"""POST /api/export/{xlsx,memorial,bdi} — Sprint 4."""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field

from ..engines.bdi import calcular_bdi
from ..engines.memorial import render_memorial_pdf
from ..engines.xlsx import render_orcamento_xlsx
from ..lib.audit import log_action
from ..lib.auth import require_user_jwt

logger = logging.getLogger(__name__)
router = APIRouter()


class BdiInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lucro_pct: float = Field(default=8.0, ge=0, le=100)
    despesas_indiretas_pct: float = Field(default=3.0, ge=0, le=100)
    risco_pct: float = Field(default=1.0, ge=0, le=100)
    despesas_financeiras_pct: float = Field(default=1.0, ge=0, le=100)
    iss_pct: float = Field(default=5.0, ge=0, le=100)
    pis_pct: float = Field(default=0.65, ge=0, le=100)
    cofins_pct: float = Field(default=3.0, ge=0, le=100)
    irpj_pct: float = Field(default=1.2, ge=0, le=100)
    csll_pct: float = Field(default=1.08, ge=0, le=100)


class XlsxRenderInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_id: str
    bdi: BdiInput | None = None


class MemorialRenderInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_id: str


@router.post("/bdi/calc")
def calc_bdi_endpoint(
    payload: BdiInput,
    auth: dict[str, Any] = Depends(require_user_jwt),  # noqa: ARG001
) -> dict[str, Any]:
    try:
        return calcular_bdi(**payload.model_dump())
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.post("/xlsx")
def export_xlsx(
    payload: XlsxRenderInput,
    auth: dict[str, Any] = Depends(require_user_jwt),
) -> Response:
    bdi_dict = (
        calcular_bdi(**payload.bdi.model_dump()) if payload.bdi else calcular_bdi()
    )
    try:
        xlsx_bytes = render_orcamento_xlsx(payload.project_id, bdi_dict)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("xlsx render falhou")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"xlsx render falhou: {exc}",
        ) from exc

    log_action(
        action="export.xlsx",
        user_id=auth.get("user_id"),
        org_id=auth.get("org_id"),
        target_type="project",
        target_id=payload.project_id,
        metadata={"bdi_pct": bdi_dict["bdi_pct"], "size_bytes": len(xlsx_bytes)},
    )
    return Response(
        content=xlsx_bytes,
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": (
                f'attachment; filename="orcamento-{payload.project_id[:8]}.xlsx"'
            ),
        },
    )


@router.post("/memorial")
def export_memorial(
    payload: MemorialRenderInput,
    auth: dict[str, Any] = Depends(require_user_jwt),
) -> Response:
    try:
        pdf_bytes = render_memorial_pdf(payload.project_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("memorial render falhou")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"memorial render falhou: {exc}",
        ) from exc

    log_action(
        action="export.memorial",
        user_id=auth.get("user_id"),
        org_id=auth.get("org_id"),
        target_type="project",
        target_id=payload.project_id,
        metadata={"size_bytes": len(pdf_bytes)},
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="memorial-{payload.project_id[:8]}.pdf"'
            ),
        },
    )
