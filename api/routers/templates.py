"""GET /api/templates/perguntas — Sprint 5.

Catálogo curado de perguntas comuns por disciplina. Permite ao frontend exibir
chips clicáveis sem hard-coding. Chave: disciplina (arq|est|hid|ele|demo|acab).

`{var}` em placeholders indica variável injetável (frontend pré-popula via
`PerguntaPlantaPanel`'s variáveis).
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter

router = APIRouter()

PERGUNTAS_TEMPLATES: dict[str, list[dict[str, str]]] = {
    "arq": [
        {"label": "Área construída total", "pergunta": "Qual a área construída total em m²?"},
        {"label": "Portas e janelas por tipo", "pergunta": "Quantas portas e quantas janelas, separadas por tipo?"},
        {"label": "Perímetro de paredes a pintar", "pergunta": "Qual o perímetro total de paredes a pintar internamente?"},
        {"label": "Área de fachadas", "pergunta": "Qual a área total de fachadas em m²?"},
    ],
    "ele": [
        {"label": "Pontos de tomada", "pergunta": "Calcule o número de pontos de tomada."},
        {"label": "Pontos de luz por ambiente", "pergunta": "Quantos pontos de luz por ambiente?"},
        {"label": "Eletrodutos visíveis (m)", "pergunta": "Metros lineares de eletrodutos visíveis na planta."},
        {"label": "Quadros e disjuntores", "pergunta": "Quantos quadros de distribuição e disjuntores há?"},
    ],
    "hid": [
        {"label": "Tubulação água fria por DN", "pergunta": "Comprimento total de tubulação de água fria por diâmetro."},
        {"label": "Pontos hidráulicos", "pergunta": "Quantos pontos de hidráulica (torneira, ducha, vaso)?"},
        {"label": "Tubulação de esgoto", "pergunta": "Comprimento total de tubulação de esgoto por diâmetro."},
    ],
    "demo": [
        {
            "label": "Área de demolição de paredes",
            "pergunta": "Qual a área de demolição de paredes para um pé direito de {pe_direito_m} m?",
        },
        {"label": "Área de remoção de piso", "pergunta": "Qual a área de remoção de piso por tipo?"},
        {"label": "Volume de entulho", "pergunta": "Estime o volume de entulho gerado em m³."},
    ],
    "est": [
        {"label": "Volume de concreto por elemento", "pergunta": "Volume total de concreto por elemento (pilar, viga, laje) em m³."},
        {"label": "Massa de aço estimada", "pergunta": "Massa de aço total estimada em kg."},
        {"label": "Área de fôrma", "pergunta": "Área total de fôrma em m²."},
    ],
    "acab": [
        {"label": "Quadro de acabamentos", "pergunta": "Liste o quadro de acabamentos por ambiente (teto, paredes, piso, rodapé)."},
        {"label": "Área de revestimento cerâmico", "pergunta": "Área total de revestimento cerâmico por ambiente."},
    ],
}

DISCIPLINA_LABELS = {
    "arq": "Arquitetônica",
    "ele": "Elétrica",
    "hid": "Hidráulica",
    "demo": "Demolição",
    "est": "Estrutural",
    "acab": "Acabamentos",
}


@router.get("/perguntas")
def listar_perguntas() -> dict[str, Any]:
    """Devolve catálogo completo. Sem auth — leitura pública (não tem dado privado)."""
    return {
        "disciplinas": [
            {
                "key": k,
                "label": DISCIPLINA_LABELS.get(k, k),
                "perguntas": v,
            }
            for k, v in PERGUNTAS_TEMPLATES.items()
        ],
    }


@router.get("/perguntas/{disciplina}")
def listar_perguntas_por_disciplina(disciplina: str) -> dict[str, Any]:
    """Devolve só uma disciplina. 404 se chave inválida."""
    if disciplina not in PERGUNTAS_TEMPLATES:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"disciplina {disciplina!r} não existe. Use {list(PERGUNTAS_TEMPLATES)}",
        )
    return {
        "key": disciplina,
        "label": DISCIPLINA_LABELS.get(disciplina, disciplina),
        "perguntas": PERGUNTAS_TEMPLATES[disciplina],
    }
