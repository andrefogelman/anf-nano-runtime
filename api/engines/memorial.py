"""Memorial de cálculo PDF (Sprint 4) — reportlab.

Para cada item de ob_orcamento_items, gera uma seção com:
  - EAP code + descrição
  - Tabela: quantidade, fonte, código, data base, custo unit, custo total
  - Memorial de cálculo (do quantitativo associado, se houver)
  - Origem (ambiente/prancha) + confiança

PDF tamanho A4, fonte Helvetica, header com nome do projeto + data geração.
"""
from __future__ import annotations

import io
import logging
from datetime import datetime, timezone
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from ..lib.supabase import get_supabase

logger = logging.getLogger(__name__)


def render_memorial_pdf(project_id: str) -> bytes:
    sb = get_supabase()

    proj_res = sb.table("ob_projects").select("*").eq("id", project_id).limit(1).execute()
    if not proj_res.data:
        raise ValueError(f"projeto {project_id} não encontrado")
    project = proj_res.data[0]

    items_res = (
        sb.table("ob_orcamento_items")
        .select("*")
        .eq("project_id", project_id)
        .order("eap_code")
        .execute()
    )
    items = items_res.data or []

    # Indexa quantitativos por id pra lookup rápido
    quant_ids = {it.get("quantitativo_id") for it in items if it.get("quantitativo_id")}
    quantitativos: dict[str, dict[str, Any]] = {}
    if quant_ids:
        quant_res = (
            sb.table("ob_quantitativos")
            .select("*")
            .in_("id", list(quant_ids))
            .execute()
        )
        for q in quant_res.data or []:
            quantitativos[q["id"]] = q

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        title=f"Memorial — {project.get('name', '')}",
        author="Orcamentista IA",
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
    )

    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="ItemTitle",
            parent=styles["Heading3"],
            spaceBefore=10,
            spaceAfter=4,
            textColor=colors.HexColor("#1E3A8A"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="MemorialText",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
        )
    )

    story: list[Any] = []
    story.append(Paragraph(f"Memorial de Cálculo — {project.get('name', '')}", styles["Title"]))
    subtitle_bits = [
        project.get("tipo_obra") or "",
        f"{project.get('cidade') or ''}/{project.get('uf') or ''}".strip("/"),
    ]
    subtitle = " · ".join(b for b in subtitle_bits if b)
    if subtitle:
        story.append(Paragraph(subtitle, styles["Italic"]))
    story.append(
        Paragraph(
            f"Gerado em {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M UTC')}",
            styles["Normal"],
        )
    )
    story.append(Spacer(1, 0.6 * cm))

    if not items:
        story.append(Paragraph("Sem itens de orçamento ainda.", styles["BodyText"]))
        doc.build(story)
        return buf.getvalue()

    for item in items:
        eap = item.get("eap_code") or ""
        descricao = item.get("descricao") or ""
        story.append(Paragraph(f"<b>{eap}</b> — {descricao}", styles["ItemTitle"]))

        rows: list[list[Any]] = [
            [
                "Quantidade",
                f"{_fmt_num(item.get('quantidade'))} {item.get('unidade') or ''}".strip(),
            ],
            [
                "Fonte",
                _format_fonte(item),
            ],
            [
                "Custo unitário",
                f"R$ {_fmt_money(item.get('custo_unitario'))}",
            ],
            [
                "Custo total",
                f"R$ {_fmt_money(item.get('custo_total'))}",
            ],
        ]
        if item.get("custo_material") or item.get("custo_mao_obra"):
            rows.append(
                [
                    "Material / Mão de obra",
                    f"R$ {_fmt_money(item.get('custo_material'))} / R$ {_fmt_money(item.get('custo_mao_obra'))}",
                ]
            )
        if item.get("curva_abc_classe"):
            rows.append(
                [
                    "Curva ABC",
                    f"Classe {item['curva_abc_classe']} ({_fmt_pct(item.get('peso_percentual'))})",
                ]
            )

        quant = quantitativos.get(item.get("quantitativo_id"))
        if quant:
            if quant.get("calculo_memorial"):
                rows.append(["Memorial qty", quant["calculo_memorial"]])
            if quant.get("origem_ambiente"):
                conf = _fmt_pct(quant.get("confidence"))
                rows.append(
                    [
                        "Origem",
                        f"{quant['origem_ambiente']} (confiança {conf})",
                    ]
                )

        table = Table(
            rows,
            colWidths=[4.5 * cm, 12 * cm],
            hAlign="LEFT",
        )
        table.setStyle(
            TableStyle(
                [
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D1D5DB")),
                    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F3F4F6")),
                    ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ]
            )
        )
        story.append(table)
        story.append(Spacer(1, 0.3 * cm))

    doc.build(story)
    return buf.getvalue()


def _format_fonte(item: dict[str, Any]) -> str:
    fonte = item.get("fonte") or "—"
    codigo = item.get("fonte_codigo") or ""
    data = item.get("fonte_data_base") or ""
    parts = [fonte]
    if codigo:
        parts.append(f"código {codigo}")
    if data:
        parts.append(f"data base {data}")
    return " · ".join(parts)


def _fmt_num(value: Any, decimals: int = 2) -> str:
    if value is None:
        return "—"
    try:
        return f"{float(value):,.{decimals}f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except (TypeError, ValueError):
        return str(value)


def _fmt_money(value: Any) -> str:
    return _fmt_num(value, 2)


def _fmt_pct(value: Any) -> str:
    if value is None:
        return "—"
    try:
        f = float(value)
        if f <= 1:
            f *= 100
        return f"{f:.1f}%".replace(".", ",")
    except (TypeError, ValueError):
        return str(value)
