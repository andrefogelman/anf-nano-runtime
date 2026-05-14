"""Helpers de cache para respostas vision.

Tabela: ob_vision_cache (chave: pdf_sha256 + question_hash).
Implementação completa no Sprint 1 quando /api/ask for plumado.
"""
from __future__ import annotations

import hashlib


def hash_question(pergunta: str, variaveis: dict | None = None) -> str:
    """Hash determinístico de pergunta + variáveis para uso como chave de cache."""
    payload = pergunta.strip().lower()
    if variaveis:
        items = sorted(variaveis.items())
        payload += "|" + "|".join(f"{k}={v}" for k, v in items)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def hash_pdf_bytes(pdf: bytes) -> str:
    """SHA-256 do conteúdo do PDF para chave de cache."""
    return hashlib.sha256(pdf).hexdigest()
