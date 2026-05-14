"""Auth helpers — Sprint 1 refinado.

Dois caminhos de autenticação coexistem (compat com frontend legado):

1. **Supabase JWT** (preferido) — frontend novo manda
   `Authorization: Bearer <jwt>` obtido via `supabase.auth.getSession()`.
   `require_user_jwt()` valida via SUPABASE_JWT_SECRET (HS256, audience=authenticated)
   e devolve `{user_id, org_id, mode: "jwt"}`.

2. **ORCABOT_API_SECRET Bearer** (legado) — frontend antigo manda
   `Authorization: Bearer <ORCABOT_API_SECRET>`. Sem identidade de usuário.
   `require_auth()` aceita os dois e retorna `AuthContext`.

Sprint 5+ remove o caminho legado.
"""
from __future__ import annotations

import os
from typing import Annotated, Any

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt

from .supabase import get_supabase


class AuthContext:
    """Resultado da autenticação dual.

    user_id == None ⇒ autenticação via API_SECRET sem identidade (legado).
    """

    def __init__(self, user_id: str | None, mode: str, org_id: str | None = None) -> None:
        self.user_id = user_id
        self.mode = mode  # "jwt" | "api_secret"
        self.org_id = org_id


def _try_api_secret(token: str) -> AuthContext | None:
    expected = os.environ.get("ORCABOT_API_SECRET")
    if expected and token == expected:
        return AuthContext(user_id=None, mode="api_secret", org_id=None)
    return None


def _try_supabase_jwt(token: str) -> AuthContext | None:
    secret = os.environ.get("SUPABASE_JWT_SECRET")
    if not secret:
        return None
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"], audience="authenticated")
    except JWTError:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return AuthContext(user_id=user_id, mode="jwt", org_id=_lookup_org(user_id))


def _lookup_org(user_id: str) -> str | None:
    """Pega a primeira org do usuário em ob_org_members (multi-org no Sprint 5+)."""
    try:
        sb = get_supabase()
        res = (
            sb.table("ob_org_members")
            .select("org_id")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        rows = res.data or []
        return rows[0]["org_id"] if rows else None
    except Exception:
        return None


def require_auth(
    authorization: Annotated[str | None, Header()] = None,
) -> AuthContext:
    """Aceita Supabase JWT OU ORCABOT_API_SECRET. Use em endpoints legados ainda."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization: Bearer <token> obrigatório",
        )
    token = authorization.split(" ", 1)[1].strip()
    ctx = _try_supabase_jwt(token) or _try_api_secret(token)
    if ctx is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )
    return ctx


def require_user_jwt(
    authorization: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    """Exige Supabase JWT válido. Devolve {user_id, org_id, mode}.

    Use em endpoints novos que precisam saber QUEM é o usuário (multi-tenant).
    Rejeita ORCABOT_API_SECRET — esse fica só pros endpoints legados.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer JWT obrigatório",
        )
    token = authorization.split(" ", 1)[1].strip()
    ctx = _try_supabase_jwt(token)
    if ctx is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="JWT inválido ou expirado",
        )
    return {"user_id": ctx.user_id, "org_id": ctx.org_id, "mode": ctx.mode}


AuthDep = Annotated[AuthContext, Depends(require_auth)]
JwtAuthDep = Annotated[dict[str, Any], Depends(require_user_jwt)]
