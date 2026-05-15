"""Vercel Cron endpoints (Sprint 3).

Vercel chama estes endpoints conforme `vercel.json` `crons[]`. Authentication
via header `Authorization: Bearer ${CRON_SECRET}` (Vercel injeta automaticamente
quando configurado no dashboard sob "Cron Secret").
"""
from __future__ import annotations

import logging
import os
from typing import Annotated, Any

from fastapi import APIRouter, Header, HTTPException, status

logger = logging.getLogger(__name__)
router = APIRouter()


def _require_cron_secret(authorization: str | None) -> None:
    expected = os.environ.get("CRON_SECRET")
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRON_SECRET não configurada",
        )
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    token = authorization.split(" ", 1)[1].strip()
    if token != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)


@router.get("/sinapi/refresh")
def sinapi_refresh(
    authorization: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    """Cron mensal: refresh dos preços SINAPI a partir da última publicação Caixa.

    Sprint 3: stub. Sprint 4 implementa o pipeline completo:
      1. Scrape https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi
         pra pegar URL do Excel da última data_base.
      2. Download + parse das planilhas analíticas.
      3. Upsert em ob_sinapi_composicoes (chave codigo+uf+data_base).
      4. Re-embed apenas linhas novas em ob_sinapi_chunks via /api/admin/sinapi/reembed.
    """
    _require_cron_secret(authorization)
    logger.info("cron sinapi/refresh chamado (stub Sprint 3)")
    return {
        "status": "stub",
        "message": "Refresh SINAPI completo será implementado no Sprint 4.",
    }
