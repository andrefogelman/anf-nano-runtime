"""Schemas Pydantic para POST /api/ask (Sprint 1)."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

ProviderLiteral = Literal["openai", "claude", "google"]
ReasoningLiteral = Literal["low", "medium", "high"]


class PerguntaInput(BaseModel):
    """Input JSON do /api/ask. PDF vem como multipart à parte."""

    model_config = ConfigDict(extra="forbid")

    pergunta: str = Field(
        min_length=3,
        max_length=500,
        description="Pergunta livre em pt-BR sobre a planta.",
    )
    variaveis: dict[str, Any] = Field(
        default_factory=dict,
        description="Variáveis numéricas usadas no cálculo, ex: {'pe_direito_m': 2.60, 'uf': 'SP'}.",
    )
    provider: ProviderLiteral = Field(default="openai")
    model: str | None = Field(default=None, description="Override do modelo (default por provider).")
    reasoning_effort: ReasoningLiteral = Field(default="medium")
    include_verification: bool = Field(default=False)
    project_id: str | None = Field(default=None, description="UUID de ob_projects para log + cache scope.")
    pdf_page_id: str | None = Field(default=None, description="UUID de ob_pdf_pages se a pergunta refere uma página específica.")


class RespostaOutput(BaseModel):
    """Output estruturado do vision model. Schema fixo p/ parsing confiável."""

    model_config = ConfigDict(extra="forbid")

    valor_numerico: float | None = Field(default=None)
    unidade: str | None = Field(default=None)
    raciocinio: str = Field(default="")
    confianca: float = Field(default=0.0, ge=0.0, le=1.0)
    observacoes: str = Field(default="")


class AskResult(BaseModel):
    """Envelope retornado pelo POST /api/ask."""

    model_config = ConfigDict(extra="forbid")

    resposta: RespostaOutput
    cache_hit: bool
    custo_usd: float
    duracao_s: float
    provider: str
    model: str
    query_id: str
