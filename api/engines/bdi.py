"""BDI (Benefícios e Despesas Indiretas) — Acórdão TCU 2622/2013 (Sprint 4).

Fórmula:
    BDI = ((1 + AC) × (1 + DF) × (1 + L)) / (1 - I) - 1

Onde:
- AC: despesas de administração central + risco (em fração)
- DF: despesas financeiras (1% padrão TCU)
- L:  lucro
- I:  total de tributos sobre o faturamento (ISS + PIS + COFINS + IRPJ + CSLL)

Defaults baseados em mediana TCU 2013 pra obras de edificações privadas.
Acordão TCU 2622/2013 dá faixas; defaults aqui são valores típicos.
"""
from __future__ import annotations

from typing import Any


def calcular_bdi(
    *,
    lucro_pct: float = 8.0,
    despesas_indiretas_pct: float = 3.0,
    risco_pct: float = 1.0,
    despesas_financeiras_pct: float = 1.0,
    iss_pct: float = 5.0,
    pis_pct: float = 0.65,
    cofins_pct: float = 3.0,
    irpj_pct: float = 1.2,
    csll_pct: float = 1.08,
) -> dict[str, Any]:
    """Calcula BDI conforme Acórdão TCU 2622/2013.

    Todos os percentuais são em pontos percentuais (ex: 8.0 = 8%).
    Retorna dict com componentes + bdi_pct + multiplicador (1 + BDI).
    """
    if not 0 <= lucro_pct <= 100:
        raise ValueError("lucro_pct fora da faixa [0, 100]")
    tributos_total_pct = iss_pct + pis_pct + cofins_pct + irpj_pct + csll_pct
    if tributos_total_pct >= 100:
        raise ValueError("Soma de tributos não pode ser >= 100%")

    AC = (despesas_indiretas_pct + risco_pct) / 100
    DF = despesas_financeiras_pct / 100
    L = lucro_pct / 100
    I = tributos_total_pct / 100

    bdi = ((1 + AC) * (1 + DF) * (1 + L)) / (1 - I) - 1

    return {
        "lucro_pct": lucro_pct,
        "despesas_indiretas_pct": despesas_indiretas_pct,
        "risco_pct": risco_pct,
        "despesas_financeiras_pct": despesas_financeiras_pct,
        "tributos": {
            "iss": iss_pct,
            "pis": pis_pct,
            "cofins": cofins_pct,
            "irpj": irpj_pct,
            "csll": csll_pct,
            "total": round(tributos_total_pct, 4),
        },
        "componentes_fracao": {
            "AC": round(AC, 6),
            "DF": round(DF, 6),
            "L": round(L, 6),
            "I": round(I, 6),
        },
        "bdi_pct": round(bdi * 100, 4),
        "multiplicador": round(1 + bdi, 6),
    }


def aplicar_bdi(custo_direto: float, bdi: dict[str, Any] | float) -> float:
    """Aplica multiplicador BDI sobre custo direto. Aceita dict (calcular_bdi) ou float."""
    mult = bdi if isinstance(bdi, (int, float)) else bdi["multiplicador"]
    return custo_direto * float(mult)
