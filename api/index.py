"""Orcamentista IA — FastAPI ASGI app (Vercel @vercel/python@5.x).

Single entry-point. Vercel rewrites /api/(.*) -> /api/index.py.
Sub-routers handle /api/ask, /api/extract, /api/dxf, /api/sinapi.
"""
from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import admin, ask, cron, dxf, extract, sinapi

app = FastAPI(
    title="Orcamentista IA Engine",
    version="0.1.0",
    description="API de orçamento de obra (vision Q&A + DXF + SINAPI matcher).",
)

# CORS — Sprint 0 wide-open. Tighten before public beta.
_cors_origins = os.environ.get("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins if o.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/healthz")
def healthz() -> dict[str, str]:
    """Liveness probe. Sem auth. Usado pelo Vercel canary e smoke deploys."""
    return {"status": "ok", "service": "orcamentista-engine", "version": "0.1.0"}


app.include_router(ask.router, prefix="/api/ask", tags=["ask"])
app.include_router(extract.router, prefix="/api/extract", tags=["extract"])
app.include_router(dxf.router, prefix="/api/dxf", tags=["dxf"])
app.include_router(sinapi.router, prefix="/api/sinapi", tags=["sinapi"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(cron.router, prefix="/api/cron", tags=["cron"])
