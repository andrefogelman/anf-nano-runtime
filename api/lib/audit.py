"""Helper centralizado para escrever em ob_audit_log (Sprint 5).

Best-effort: falhas de log nunca bloqueiam a request.
"""
from __future__ import annotations

import logging
from typing import Any

from .supabase import get_supabase

logger = logging.getLogger(__name__)


def log_action(
    *,
    action: str,
    user_id: str | None = None,
    org_id: str | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
) -> None:
    """Insere uma linha em ob_audit_log. Falhas são logadas mas não relançadas.

    `action` é um dot-path conciso (ex: 'export.xlsx', 'sinapi.match',
    'admin.reembed', 'cron.sinapi.refresh').
    """
    try:
        get_supabase().table("ob_audit_log").insert(
            {
                "user_id": user_id,
                "org_id": org_id,
                "action": action,
                "target_type": target_type,
                "target_id": target_id,
                "metadata": metadata or {},
                "ip": ip,
                "user_agent": user_agent,
            }
        ).execute()
    except Exception:
        logger.exception("audit log insert falhou (action=%s)", action)
