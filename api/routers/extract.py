"""POST /api/extract/{disciplina} — Vision schema-driven (Sprint 2).

Disciplinas: arq | est | mep | acab | quadro.

Diferente de /api/ask (Q&A livre), este endpoint força o LLM a devolver JSON
estruturado conforme o schema da disciplina. Opcionalmente persiste em
ob_quantitativos (com needs_review=true).
"""
from __future__ import annotations

import logging
import tempfile
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from gaik.software_components.vision_extractor import VisionExtractor

from ..lib.auth import require_user_jwt
from ..lib.supabase import get_supabase
from ..schemas.extract import DISCIPLINA_LABELS, SCHEMAS

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_PDF_BYTES = 30 * 1024 * 1024  # 30MB

_PROMPTS: dict[str, str] = {
    "arq": (
        "Extraia todos os ambientes da planta arquitetônica brasileira. Para cada "
        "ambiente: nome, pavimento (se aplicável), área de piso em m², perímetro "
        "em m, pé direito em m, e lista de aberturas (porta/janela/vão) com largura "
        "× altura × quantidade. Devolva também área construída total e fachadas em m²."
    ),
    "est": (
        "Extraia todos os elementos estruturais (pilares, vigas, lajes, fundações, "
        "escadas, muros de arrimo). Para cada um: identificação (P1, V12, L3...), "
        "seção em cm, volume de concreto em m³, massa de aço em kg, área de fôrma em m². "
        "Devolva também fck em MPa e volume de escavação em m³ se mostrados."
    ),
    "mep": (
        "Extraia tubulações (sistema, diâmetro mm, material, comprimento m), pontos "
        "elétricos (tipo, quantidade, ambiente) e equipamentos MEP (tipo, descrição, "
        "quantidade, ambiente)."
    ),
    "acab": (
        "Extraia o memorial/quadro de acabamentos por ambiente: teto/forro, paredes, "
        "piso, rodapé. Inclua observações relevantes (ex: revestimento até a altura X)."
    ),
    "quadro": (
        "Extraia a tabela ou quadro de quantitativos completa. Para cada linha: "
        "descrição do serviço/material, unidade (m, m², m³, unid, kg, etc.) e "
        "quantidade numérica. Inclua título do quadro se houver."
    ),
}


@router.post("/{disciplina}")
async def extract(
    disciplina: str,
    pdf: UploadFile = File(..., description="PDF da planta (≤ 30MB)"),
    provider: str = Form("openai"),
    model: str | None = Form(None),
    reasoning_effort: str = Form("medium"),
    project_id: str | None = Form(None),
    save_quantitativos: bool = Form(False),
    auth: dict[str, Any] = Depends(require_user_jwt),
) -> dict[str, Any]:
    if disciplina not in SCHEMAS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"disciplina inválida: {disciplina!r}. Use uma de {list(SCHEMAS)}",
        )
    schema_cls = SCHEMAS[disciplina]

    pdf_bytes = await pdf.read()
    if len(pdf_bytes) > MAX_PDF_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"PDF maior que {MAX_PDF_BYTES // (1024 * 1024)}MB",
        )
    if not pdf_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PDF vazio",
        )

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(pdf_bytes)
        tmp_path = Path(tmp.name)

    try:
        extractor = VisionExtractor(
            model_provider=provider,
            model=model,
            use_azure=False,
            reasoning_effort=reasoning_effort,
            merge_table=True,
            include_verification=False,
        )
        result = extractor.extract(
            file_paths=[tmp_path],
            user_requirements=_PROMPTS[disciplina],
            extraction_model=schema_cls,
            requirements=None,
        )
    except Exception as exc:
        logger.exception("vision extractor falhou")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"vision provider falhou: {exc}",
        ) from exc
    finally:
        tmp_path.unlink(missing_ok=True)

    inserted = 0
    if save_quantitativos and project_id:
        inserted = _save_to_quantitativos(auth, project_id, disciplina, result.data)

    usage = getattr(result, "usage", None)
    return {
        "disciplina": disciplina,
        "label": DISCIPLINA_LABELS[disciplina],
        "data": result.data,
        "duracao_s": float(getattr(result, "duration_s", 0.0) or 0.0),
        "custo_usd": float(getattr(usage, "cost_usd", 0.0) or 0.0) if usage else 0.0,
        "model_used": getattr(result, "model", model),
        "quantitativos_inseridos": inserted,
    }


def _save_to_quantitativos(
    auth: dict[str, Any],
    project_id: str,
    disciplina: str,
    data: dict[str, Any],
) -> int:
    """Converte o JSON estruturado em linhas de ob_quantitativos (needs_review=true).

    Retorna o número de linhas inseridas. Falhas individuais não param o batch
    (best-effort) — o user pode revisar/completar pela UI depois.
    """
    rows: list[dict[str, Any]] = []
    user_id = auth.get("user_id")

    if disciplina == "arq":
        for amb in data.get("ambientes", []):
            if amb.get("area_piso_m2"):
                rows.append(
                    _row(
                        project_id=project_id,
                        disciplina="arq",
                        descricao=f"Área de piso — {amb['nome']}",
                        unidade="m2",
                        quantidade=amb["area_piso_m2"],
                        memorial=f"Ambiente '{amb['nome']}' extraído da planta arquitetônica",
                        user_id=user_id,
                        confidence=0.8,
                    )
                )
            if amb.get("perimetro_m") and amb.get("pe_direito_m"):
                area_parede = float(amb["perimetro_m"]) * float(amb["pe_direito_m"])
                rows.append(
                    _row(
                        project_id=project_id,
                        disciplina="arq",
                        descricao=f"Área de paredes — {amb['nome']}",
                        unidade="m2",
                        quantidade=area_parede,
                        memorial=f"perímetro {amb['perimetro_m']}m × pé direito {amb['pe_direito_m']}m",
                        user_id=user_id,
                        confidence=0.7,
                    )
                )

    elif disciplina == "est":
        for el in data.get("elementos", []):
            rows.append(
                _row(
                    project_id=project_id,
                    disciplina="est",
                    descricao=f"Concreto — {el['tipo']} {el['identificacao']}",
                    unidade="m3",
                    quantidade=el["volume_concreto_m3"],
                    memorial=f"Elemento estrutural {el['tipo']} {el.get('secao_cm') or ''}".strip(),
                    user_id=user_id,
                    confidence=0.85,
                )
            )
            if el.get("massa_aco_kg"):
                rows.append(
                    _row(
                        project_id=project_id,
                        disciplina="est",
                        descricao=f"Aço — {el['tipo']} {el['identificacao']}",
                        unidade="kg",
                        quantidade=el["massa_aco_kg"],
                        memorial="Massa de aço do elemento estrutural",
                        user_id=user_id,
                        confidence=0.8,
                    )
                )

    elif disciplina == "mep":
        for t in data.get("tubulacoes", []):
            rows.append(
                _row(
                    project_id=project_id,
                    disciplina="hid",
                    descricao=f"Tubulação {t['sistema']} DN{t['diametro_mm']} {t['material']}",
                    unidade="m",
                    quantidade=t["comprimento_m"],
                    memorial="Extraído da planta MEP",
                    user_id=user_id,
                    confidence=0.75,
                )
            )
        for p in data.get("pontos_eletricos", []):
            rows.append(
                _row(
                    project_id=project_id,
                    disciplina="ele",
                    descricao=(
                        f"Ponto elétrico {p['tipo']}"
                        + (f" — {p['ambiente']}" if p.get("ambiente") else "")
                    ),
                    unidade="unid",
                    quantidade=p["quantidade"],
                    memorial="Contagem direta na planta elétrica",
                    user_id=user_id,
                    confidence=0.8,
                )
            )

    elif disciplina == "quadro":
        for it in data.get("itens", []):
            rows.append(
                _row(
                    project_id=project_id,
                    disciplina=None,
                    descricao=it["descricao"],
                    unidade=it["unidade"],
                    quantidade=it["quantidade"],
                    memorial=it.get("observacao", "") or "Extraído de quadro/tabela",
                    user_id=user_id,
                    confidence=0.9,
                )
            )

    if not rows:
        return 0

    try:
        get_supabase().table("ob_quantitativos").insert(rows).execute()
    except Exception:
        logger.exception("falha inserindo ob_quantitativos (extracao retorna mesmo assim)")
        return 0
    return len(rows)


def _row(
    *,
    project_id: str,
    disciplina: str | None,
    descricao: str,
    unidade: str,
    quantidade: Any,
    memorial: str,
    user_id: str | None,
    confidence: float,
) -> dict[str, Any]:
    return {
        "project_id": project_id,
        "disciplina": disciplina,
        "descricao": descricao,
        "unidade": unidade,
        "quantidade": float(quantidade) if quantidade is not None else 0.0,
        "calculo_memorial": memorial,
        "created_by": user_id,
        "confidence": confidence,
        "needs_review": True,
    }
