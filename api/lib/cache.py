"""Cache de respostas vision por (pdf_sha256, question_hash) em ob_vision_cache.

Service-role escreve; users só leem (RLS configurada na migration 20260410000002).
"""
from __future__ import annotations

import hashlib
from typing import Any

from .supabase import get_supabase


def hash_question(pergunta: str, variaveis: dict[str, Any] | None = None) -> str:
    """Hash determinístico legado (mantido p/ compat). Use engines.vision.hash_question."""
    payload = pergunta.strip().lower()
    if variaveis:
        items = sorted(variaveis.items())
        payload += "|" + "|".join(f"{k}={v}" for k, v in items)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def hash_pdf_bytes(pdf: bytes) -> str:
    """SHA-256 do PDF — chave do cache."""
    return hashlib.sha256(pdf).hexdigest()


def get_cached(pdf_sha256: str, question_hash: str) -> dict[str, Any] | None:
    """Busca uma resposta cacheada e incrementa hit_count + accessed_at.

    Retorna apenas o JSON da resposta (não o envelope todo). None se cache miss.
    """
    sb = get_supabase()
    res = (
        sb.table("ob_vision_cache")
        .select("id, resposta, hit_count")
        .eq("pdf_sha256", pdf_sha256)
        .eq("question_hash", question_hash)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    if not rows:
        return None
    row = rows[0]
    sb.table("ob_vision_cache").update(
        {
            "hit_count": (row.get("hit_count") or 0) + 1,
            "accessed_at": "now()",
        }
    ).eq("id", row["id"]).execute()
    return row["resposta"]


def put_cache(
    pdf_sha256: str,
    question_hash: str,
    resposta: dict[str, Any],
    *,
    org_id: str | None = None,
    project_id: str | None = None,
) -> None:
    """Upsert idempotente em ob_vision_cache (UNIQUE pdf_sha256+question_hash)."""
    sb = get_supabase()
    sb.table("ob_vision_cache").upsert(
        {
            "pdf_sha256": pdf_sha256,
            "question_hash": question_hash,
            "resposta": resposta,
            "org_id": org_id,
            "project_id": project_id,
            "hit_count": 0,
            "accessed_at": "now()",
        },
        on_conflict="pdf_sha256,question_hash",
    ).execute()
