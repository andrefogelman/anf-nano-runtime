"""Schemas Pydantic para POST /api/extract/{disciplina} (Sprint 2).

5 disciplinas: arq | est | mep | acab | quadro.
Cada schema é o `extraction_model` passado pro gaik VisionExtractor — força
o LLM a devolver JSON estruturado em vez de texto livre.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# Arquitetônica (arq)
# ============================================================
class Abertura(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tipo: Literal["porta", "janela", "vao"]
    largura_m: Decimal
    altura_m: Decimal
    quantidade: int = Field(default=1, ge=1)


class Ambiente(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nome: str
    pavimento: str | None = None
    area_piso_m2: Decimal | None = None
    perimetro_m: Decimal | None = None
    pe_direito_m: Decimal | None = None
    aberturas: list[Abertura] = Field(default_factory=list)


class PlantaArquitetonica(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ambientes: list[Ambiente]
    area_construida_total_m2: Decimal | None = None
    fachadas_m2: Decimal | None = None


# ============================================================
# Estrutural (est)
# ============================================================
class ElementoEstrutural(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tipo: Literal["pilar", "viga", "laje", "fundacao", "escada", "muro_arrimo"]
    identificacao: str
    secao_cm: str | None = None
    volume_concreto_m3: Decimal
    massa_aco_kg: Decimal | None = None
    area_forma_m2: Decimal | None = None


class PlantaEstrutural(BaseModel):
    model_config = ConfigDict(extra="forbid")

    elementos: list[ElementoEstrutural]
    fck_mpa: Decimal | None = None
    volume_escavacao_m3: Decimal | None = None


# ============================================================
# MEP — Mecânico/Elétrico/Hidráulico (mep)
# ============================================================
class Tubulacao(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sistema: Literal["agua_fria", "agua_quente", "esgoto", "pluvial", "gas", "incendio"]
    diametro_mm: int
    material: str
    comprimento_m: Decimal


class PontoEletrico(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tipo: Literal[
        "tomada_baixa",
        "tomada_alta",
        "tomada_220v",
        "interruptor",
        "ponto_luz",
        "ponto_forca",
        "tv",
        "telefone",
        "rede",
    ]
    quantidade: int = Field(ge=1)
    ambiente: str | None = None


class EquipamentoMEP(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tipo: str
    descricao: str
    quantidade: int = Field(default=1, ge=1)
    ambiente: str | None = None


class PlantaMEP(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tubulacoes: list[Tubulacao] = Field(default_factory=list)
    pontos_eletricos: list[PontoEletrico] = Field(default_factory=list)
    equipamentos: list[EquipamentoMEP] = Field(default_factory=list)


# ============================================================
# Acabamentos (acab)
# ============================================================
class AmbienteAcabamento(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nome: str
    teto_forro: str | None = None
    paredes: str | None = None
    piso: str | None = None
    rodape: str | None = None
    observacao: str = ""


class PlantaAcabamento(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ambientes: list[AmbienteAcabamento]


# ============================================================
# Quadro genérico (quadro)
# ============================================================
class ItemQuadro(BaseModel):
    model_config = ConfigDict(extra="forbid")

    descricao: str
    unidade: str
    quantidade: Decimal
    observacao: str = ""


class QuadroQuantitativo(BaseModel):
    model_config = ConfigDict(extra="forbid")

    titulo: str | None = None
    itens: list[ItemQuadro]


# ============================================================
# Registry — disciplina -> schema
# ============================================================
SCHEMAS: dict[str, type[BaseModel]] = {
    "arq": PlantaArquitetonica,
    "est": PlantaEstrutural,
    "mep": PlantaMEP,
    "acab": PlantaAcabamento,
    "quadro": QuadroQuantitativo,
}

DISCIPLINA_LABELS: dict[str, str] = {
    "arq": "Arquitetônica",
    "est": "Estrutural",
    "mep": "MEP (Hidráulico/Elétrico)",
    "acab": "Acabamentos",
    "quadro": "Quadro/Tabela genérica",
}
