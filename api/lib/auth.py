"""Autenticação dual: API_SECRET (Bearer) OU Supabase JWT (Authorization: Bearer <jwt>).

O frontend hoje envia API_SECRET (compatibilidade com runtime NanoClaw legado).
Sprint 1+ vai migrar para Supabase JWT puro (multi-tenant via auth.uid()).

Por enquanto aceitamos os dois — qualquer um válido autoriza a request.
"""
from __future__ import annotations

import os
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt


class AuthContext:
    """Resultado da autenticação. user_id None = autenticou via API_SECRET (sem identidade)."""

    def __init__(self, user_id: str | None, mode: str) -> None:
        self.user_id = user_id
        self.mode = mode  # "jwt" | "api_secret"


def _try_api_secret(token: str) -> AuthContext | None:
    expected = os.environ.get("ORCABOT_API_SECRET")
    if expected and token == expected:
        return AuthContext(user_id=None, mode="api_secret")
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
    return AuthContext(user_id=user_id, mode="jwt")


def require_auth(
    authorization: Annotated[str | None, Header()] = None,
) -> AuthContext:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization: Bearer <token>",
        )
    token = authorization.split(" ", 1)[1].strip()

    ctx = _try_supabase_jwt(token) or _try_api_secret(token)
    if ctx is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    return ctx


AuthDep = Annotated[AuthContext, Depends(require_auth)]
