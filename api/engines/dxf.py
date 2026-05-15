"""DXF engine — wrapper sobre ezdxf (Sprint 2).

Operações determinísticas (sem LLM) sobre arquivos DXF AutoCAD:

- `parse_dxf` — lista layers, contagem de entidades por (layer, tipo), block inserts
- `closed_polyline_areas` — áreas em m² de polylines fechadas via Shoelace,
  agrupadas por layer (útil pra calcular áreas de pisos, paredes, demolições)
- `count_blocks` — contagem de inserções de um bloco específico, com filtro de layer
- `extract_text` — extrai textos (TEXT/MTEXT) com posição XY e layer
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import ezdxf
from ezdxf.entities import Insert, LWPolyline, MText, Polyline


def parse_dxf(dxf_path: Path) -> dict[str, Any]:
    """Resumo geral do arquivo: layers + contagem de entidades + blocks inseridos."""
    doc = ezdxf.readfile(str(dxf_path))
    msp = doc.modelspace()

    layers = [
        {
            "name": layer.dxf.name,
            "color": int(getattr(layer.dxf, "color", 0)),
            "linetype": getattr(layer.dxf, "linetype", ""),
            "is_off": layer.is_off(),
            "is_frozen": layer.is_frozen(),
        }
        for layer in doc.layers
    ]

    entities_by_layer: dict[str, dict[str, int]] = {}
    block_inserts_by_name: dict[str, int] = {}

    for ent in msp:
        layer_name = ent.dxf.layer
        ent_type = ent.dxftype()
        per_layer = entities_by_layer.setdefault(layer_name, {})
        per_layer[ent_type] = per_layer.get(ent_type, 0) + 1
        if isinstance(ent, Insert):
            name = ent.dxf.name
            block_inserts_by_name[name] = block_inserts_by_name.get(name, 0) + 1

    n_total = sum(sum(c.values()) for c in entities_by_layer.values())

    return {
        "n_layers": len(layers),
        "layers": layers,
        "entities_by_layer": entities_by_layer,
        "block_inserts": block_inserts_by_name,
        "n_entities_total": n_total,
    }


def closed_polyline_areas(
    dxf_path: Path, layer_filter: str | None = None
) -> list[dict[str, Any]]:
    """Áreas (Shoelace) de polylines fechadas, agrupadas por layer.

    Unidade resultante = unidade do desenho (geralmente m² para plantas em metros).
    Polylines com < 3 vértices são ignoradas.
    """
    doc = ezdxf.readfile(str(dxf_path))
    msp = doc.modelspace()

    by_layer: dict[str, list[float]] = {}
    for ent in msp.query("LWPOLYLINE POLYLINE"):
        if layer_filter and ent.dxf.layer != layer_filter:
            continue
        if not getattr(ent, "is_closed", False):
            continue
        pts = _polyline_points(ent)
        if len(pts) < 3:
            continue
        area = abs(_shoelace(pts))
        by_layer.setdefault(ent.dxf.layer, []).append(area)

    return [
        {
            "layer": layer,
            "n_polylines": len(areas),
            "area_total": round(sum(areas), 4),
            "area_largest": round(max(areas), 4),
            "area_smallest": round(min(areas), 4),
        }
        for layer, areas in sorted(by_layer.items())
    ]


def count_blocks(
    dxf_path: Path, block_name: str, layer_filter: str | None = None
) -> dict[str, Any]:
    """Conta inserções de um block (case-sensitive). Filtro de layer opcional."""
    doc = ezdxf.readfile(str(dxf_path))
    msp = doc.modelspace()
    count = 0
    for ent in msp.query("INSERT"):
        if ent.dxf.name != block_name:
            continue
        if layer_filter and ent.dxf.layer != layer_filter:
            continue
        count += 1
    return {
        "block_name": block_name,
        "layer_filter": layer_filter,
        "count": count,
    }


def extract_text(
    dxf_path: Path, layer_filter: str | None = None
) -> list[dict[str, Any]]:
    """Extrai TEXT e MTEXT com posição XY e layer."""
    doc = ezdxf.readfile(str(dxf_path))
    msp = doc.modelspace()
    out: list[dict[str, Any]] = []
    for ent in msp.query("MTEXT TEXT"):
        if layer_filter and ent.dxf.layer != layer_filter:
            continue
        if isinstance(ent, MText):
            txt = ent.text
        else:
            txt = ent.dxf.text
        out.append(
            {
                "text": txt,
                "layer": ent.dxf.layer,
                "x": float(ent.dxf.insert.x),
                "y": float(ent.dxf.insert.y),
            }
        )
    return out


def _polyline_points(ent: Any) -> list[tuple[float, float]]:
    if isinstance(ent, LWPolyline):
        return [(float(p[0]), float(p[1])) for p in ent.get_points()]
    if isinstance(ent, Polyline):
        return [(float(v.dxf.location.x), float(v.dxf.location.y)) for v in ent.vertices]
    return []


def _shoelace(pts: list[tuple[float, float]]) -> float:
    """Fórmula de Gauss/Shoelace para área de polígono simples."""
    n = len(pts)
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1]
    return area / 2.0
