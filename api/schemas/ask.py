"""Schemas Pydantic para POST /api/ask. Sprint 1 popula o detalhe."""
from __future__ import annotations

from pydantic import BaseModel, Field


class PerguntaInput(BaseModel):
    """Input do /api/ask. PDF vem como multipart à parte, isto é o JSON do payload."""

    pergunta: str = Field(..., description="Pergunta livre sobre a planta")
    variaveis: dict | None = Field(default=None, description="Variáveis numéricas usadas no cálculo")
    provider: str = Field(default="openai", description="openai | anthropic | google")
    model: str | None = Field(default=None)
    reasoning_effort: str = Field(default="medium", description="low | medium | high")


class RespostaOutput(BaseModel):
    """Output estruturado do vision model. Schema fixo para garantir parsing confiável."""

    valor_numerico: float | None = None
    unidade: str | None = None
    raciocinio: str = ""
    confianca: float = Field(default=0.0, ge=0.0, le=1.0)
    observacoes: str = ""
    cache_hit: bool = False
