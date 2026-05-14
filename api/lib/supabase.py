"""Supabase client factory.

Service role client (server-side only) — usado para escrever em tabelas com RLS,
ler tabelas multi-tenant em nome do usuário (após validar JWT separadamente),
e chamar funções RPC como search_sinapi_chunks.
"""
from __future__ import annotations

import os
from functools import lru_cache

from supabase import Client, create_client


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Singleton service-role client. Reusa instância entre requests (Vercel reuse)."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios no ambiente."
        )
    return create_client(url, key)
