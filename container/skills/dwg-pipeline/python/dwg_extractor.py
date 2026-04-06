#!/usr/bin/env python3
"""
DXF Extractor — parses a DXF file using ezdxf and outputs structured JSON to stdout.

Usage:
    python3 dwg_extractor.py <dxf_path>

Output is a JSON object matching the ExtractedDxfData TypeScript schema.
"""

import json
import math
import sys
from pathlib import Path
from typing import Any

import ezdxf
from ezdxf.entities import (
    Arc,
    Circle,
    Dimension,
    Ellipse,
    Hatch,
    Insert,
    Line,
    LWPolyline,
    MText,
    Text,
)


def extract_layers(doc: ezdxf.document.Drawing, msp: Any) -> list[dict]:
    """Extract all layers with their properties and entity counts."""
    layer_entity_counts: dict[str, dict[str, int]] = {}

    for entity in msp:
        layer_name = entity.dxf.layer
        etype = entity.dxftype()
        if layer_name not in layer_entity_counts:
            layer_entity_counts[layer_name] = {}
        layer_entity_counts[layer_name][etype] = (
            layer_entity_counts[layer_name].get(etype, 0) + 1
        )

    layers = []
    for layer in doc.layers:
        name = layer.dxf.name
        layers.append(
            {
                "name": name,
                "color": layer.dxf.color,
                "is_on": layer.is_on(),
                "is_frozen": layer.is_frozen(),
                "entity_counts": layer_entity_counts.get(name, {}),
            }
        )
    return layers


def extract_entities(msp: Any) -> list[dict]:
    """Extract geometric entities: LINE, LWPOLYLINE, CIRCLE, ARC, ELLIPSE."""
    entities = []

    for entity in msp:
        etype = entity.dxftype()
        layer = entity.dxf.layer

        if etype == "LINE" and isinstance(entity, Line):
            start = entity.dxf.start
            end = entity.dxf.end
            dx = end.x - start.x
            dy = end.y - start.y
            length = math.sqrt(dx * dx + dy * dy)
            entities.append(
                {
                    "type": "LINE",
                    "layer": layer,
                    "start": [round(start.x, 4), round(start.y, 4)],
                    "end": [round(end.x, 4), round(end.y, 4)],
                    "length": round(length, 4),
                }
            )

        elif etype == "LWPOLYLINE" and isinstance(entity, LWPolyline):
            vertices = [(round(v[0], 4), round(v[1], 4)) for v in entity.get_points(format="xy")]
            is_closed = entity.closed
            try:
                length = round(entity.length(), 4) if hasattr(entity, "length") else 0
            except Exception:
                length = 0
            area = None
            if is_closed and len(vertices) >= 3:
                # Shoelace formula
                n = len(vertices)
                a = 0.0
                for i in range(n):
                    x1, y1 = vertices[i]
                    x2, y2 = vertices[(i + 1) % n]
                    a += x1 * y2 - x2 * y1
                area = round(abs(a) / 2.0, 4)

            entities.append(
                {
                    "type": "LWPOLYLINE",
                    "layer": layer,
                    "vertices": [list(v) for v in vertices],
                    "is_closed": is_closed,
                    "length": length,
                    "area": area,
                }
            )

        elif etype == "CIRCLE" and isinstance(entity, Circle):
            center = entity.dxf.center
            entities.append(
                {
                    "type": "CIRCLE",
                    "layer": layer,
                    "center": [round(center.x, 4), round(center.y, 4)],
                    "radius": round(entity.dxf.radius, 4),
                }
            )

        elif etype == "ARC" and isinstance(entity, Arc):
            center = entity.dxf.center
            radius = entity.dxf.radius
            start_angle = entity.dxf.start_angle
            end_angle = entity.dxf.end_angle
            # Arc length
            angle_span = end_angle - start_angle
            if angle_span < 0:
                angle_span += 360.0
            arc_length = round(math.radians(angle_span) * radius, 4)

            entities.append(
                {
                    "type": "ARC",
                    "layer": layer,
                    "center": [round(center.x, 4), round(center.y, 4)],
                    "radius": round(radius, 4),
                    "start_angle": round(start_angle, 4),
                    "end_angle": round(end_angle, 4),
                    "length": arc_length,
                }
            )

        elif etype == "ELLIPSE" and isinstance(entity, Ellipse):
            center = entity.dxf.center
            major = entity.dxf.major_axis
            entities.append(
                {
                    "type": "ELLIPSE",
                    "layer": layer,
                    "center": [round(center.x, 4), round(center.y, 4)],
                    "major_axis": [round(major.x, 4), round(major.y, 4)],
                    "ratio": round(entity.dxf.ratio, 4),
                }
            )

    return entities


def extract_blocks(msp: Any, doc: ezdxf.document.Drawing) -> list[dict]:
    """Extract block insertions (INSERT entities) with counts and internal geometry."""
    block_counts: dict[str, int] = {}
    block_instances: dict[str, dict] = {}

    for entity in msp:
        if entity.dxftype() == "INSERT" and isinstance(entity, Insert):
            name = entity.dxf.name
            block_counts[name] = block_counts.get(name, 0) + 1

            if name not in block_instances:
                pos = entity.dxf.insert
                block_instances[name] = {
                    "name": name,
                    "position": [round(pos.x, 4), round(pos.y, 4)],
                    "rotation": round(entity.dxf.rotation, 4),
                    "scale_x": round(entity.dxf.xscale, 4),
                    "scale_y": round(entity.dxf.yscale, 4),
                    "layer": entity.dxf.layer,
                }

    blocks = []
    for name, instance in block_instances.items():
        instance["count"] = block_counts[name]

        # Extract internal entities from block definition
        internal = []
        try:
            block_layout = doc.blocks.get(name)
            if block_layout is not None:
                for be in block_layout:
                    bet = be.dxftype()
                    if bet in ("LINE", "LWPOLYLINE", "CIRCLE", "ARC"):
                        internal.append({"type": bet, "layer": be.dxf.layer})
                        if len(internal) >= 20:  # Limit to 20 for LLM context
                            break
        except Exception:
            pass

        if internal:
            instance["internal_entities"] = internal

        blocks.append(instance)

    return blocks


def extract_dimensions(msp: Any) -> list[dict]:
    """Extract DIMENSION entities with actual measurements."""
    dimensions = []

    for entity in msp:
        if entity.dxftype() == "DIMENSION" and isinstance(entity, Dimension):
            dim_type = "linear"
            try:
                dt = entity.dimtype
                if dt == 2:
                    dim_type = "angular"
                elif dt == 4:
                    dim_type = "radial"
                elif dt == 3:
                    dim_type = "diameter"
                elif dt == 6:
                    dim_type = "ordinate"
            except Exception:
                pass

            try:
                measurement = entity.dxf.actual_measurement
            except AttributeError:
                measurement = 0.0

            pos = entity.dxf.insert if hasattr(entity.dxf, "insert") else entity.dxf.defpoint
            dimensions.append(
                {
                    "type": dim_type,
                    "actual_measurement": round(measurement, 4),
                    "position": [round(pos.x, 4), round(pos.y, 4)],
                    "layer": entity.dxf.layer,
                }
            )

    return dimensions


def extract_texts(msp: Any) -> list[dict]:
    """Extract TEXT and MTEXT entities."""
    texts = []

    for entity in msp:
        etype = entity.dxftype()

        if etype == "TEXT" and isinstance(entity, Text):
            pos = entity.dxf.insert
            texts.append(
                {
                    "type": "TEXT",
                    "content": entity.dxf.text.strip(),
                    "position": [round(pos.x, 4), round(pos.y, 4)],
                    "height": round(entity.dxf.height, 4),
                    "rotation": round(entity.dxf.rotation, 4),
                    "layer": entity.dxf.layer,
                }
            )

        elif etype == "MTEXT" and isinstance(entity, MText):
            pos = entity.dxf.insert
            texts.append(
                {
                    "type": "MTEXT",
                    "content": entity.text.strip(),
                    "position": [round(pos.x, 4), round(pos.y, 4)],
                    "height": round(entity.dxf.char_height, 4),
                    "rotation": round(entity.dxf.rotation, 4) if hasattr(entity.dxf, "rotation") else 0.0,
                    "layer": entity.dxf.layer,
                }
            )

    return texts


def _edge_path_to_points(edges: list, arc_segments: int = 16) -> list[tuple[float, float]]:
    """Convert HATCH edge path (lines + arcs) to a list of (x, y) points."""
    pts: list[tuple[float, float]] = []
    for edge in edges:
        etype = getattr(edge, "EDGE_TYPE", "")
        if etype == "LineEdge":
            pts.append((edge.start[0], edge.start[1]))
        elif etype == "ArcEdge":
            cx, cy = edge.center
            r = edge.radius
            sa = math.radians(edge.start_angle)
            ea = math.radians(edge.end_angle)
            ccw = edge.ccw
            if ccw:
                if ea <= sa:
                    ea += 2 * math.pi
            else:
                if sa <= ea:
                    sa += 2 * math.pi
            for i in range(arc_segments + 1):
                t = sa + (ea - sa) * i / arc_segments
                pts.append((cx + r * math.cos(t), cy + r * math.sin(t)))
        elif etype == "EllipseEdge":
            pts.append((edge.center[0], edge.center[1]))
    return pts


def _shoelace(pts: list[tuple[float, float]]) -> float:
    """Calculate area of a polygon using the shoelace formula."""
    n = len(pts)
    if n < 3:
        return 0.0
    a = 0.0
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2.0


def extract_hatches(msp: Any) -> list[dict]:
    """Extract HATCH entities with boundary areas.

    HATCHes represent filled regions (floor areas, wall sections, etc.)
    and are critical for quantity takeoff in construction projects.
    """
    hatches = []

    for entity in msp:
        if entity.dxftype() != "HATCH" or not isinstance(entity, Hatch):
            continue

        layer = entity.dxf.layer
        pattern = entity.dxf.pattern_name

        for bp in entity.paths:
            area = 0.0
            vertices: list[list[float]] = []

            if hasattr(bp, "vertices") and bp.vertices:
                # PolylinePath — vertices directly available
                vertices = [[round(v[0], 4), round(v[1], 4)] for v in bp.vertices]
                area = _shoelace([(v[0], v[1]) for v in bp.vertices])
            elif hasattr(bp, "edges") and bp.edges:
                # EdgePath — convert arcs/lines to points first
                pts = _edge_path_to_points(bp.edges)
                if pts:
                    vertices = [[round(p[0], 4), round(p[1], 4)] for p in pts]
                    area = _shoelace(pts)

            if area < 1e-6:
                continue  # Skip degenerate hatches

            hatches.append(
                {
                    "layer": layer,
                    "pattern": pattern,
                    "area": round(area, 4),
                    "vertices": vertices[:100],  # Limit for large hatches
                }
            )

    return hatches


def _infer_units_from_bbox(msp: Any) -> str:
    """Infer units by analyzing the bounding box of all entities.

    Typical residential building footprints:
    - In meters: bbox ~ 5-50 (both axes)
    - In centimeters: bbox ~ 500-5000
    - In millimeters: bbox ~ 5000-50000
    """
    min_x, min_y = float('inf'), float('inf')
    max_x, max_y = float('-inf'), float('-inf')
    count = 0

    for entity in msp:
        etype = entity.dxftype()
        try:
            if etype == "LINE":
                for pt in [entity.dxf.start, entity.dxf.end]:
                    min_x, min_y = min(min_x, pt.x), min(min_y, pt.y)
                    max_x, max_y = max(max_x, pt.x), max(max_y, pt.y)
                    count += 1
            elif etype == "LWPOLYLINE":
                for v in entity.get_points(format="xy"):
                    min_x, min_y = min(min_x, v[0]), min(min_y, v[1])
                    max_x, max_y = max(max_x, v[0]), max(max_y, v[1])
                    count += 1
            elif etype == "CIRCLE":
                c = entity.dxf.center
                r = entity.dxf.radius
                min_x, min_y = min(min_x, c.x - r), min(min_y, c.y - r)
                max_x, max_y = max(max_x, c.x + r), max(max_y, c.y + r)
                count += 1
        except Exception:
            continue

    if count < 10:
        return "mm"

    width = max_x - min_x
    height = max_y - min_y
    max_dim = max(width, height)

    if max_dim < 1:
        return "m"
    elif max_dim <= 100:
        return "m"
    elif max_dim <= 10_000:
        return "cm"
    else:
        return "mm"


def detect_units(doc: ezdxf.document.Drawing, msp: Any) -> str:
    """Detect drawing units from DXF header, with bbox fallback for unitless."""
    try:
        insunits = doc.header.get("$INSUNITS", 0)
        unit_map = {1: "in", 2: "ft", 4: "mm", 5: "cm", 6: "m"}
        if insunits in unit_map:
            return unit_map[insunits]
    except Exception:
        pass
    return _infer_units_from_bbox(msp)


def main(dxf_path: str) -> None:
    """Main extraction function. Outputs JSON to stdout."""
    path = Path(dxf_path)
    if not path.exists():
        print(json.dumps({"error": f"File not found: {dxf_path}"}), file=sys.stderr)
        sys.exit(1)

    try:
        doc = ezdxf.readfile(str(path))
    except Exception as e:
        print(json.dumps({"error": f"Failed to parse DXF: {e}"}), file=sys.stderr)
        sys.exit(1)

    msp = doc.modelspace()

    layers = extract_layers(doc, msp)
    entities = extract_entities(msp)
    blocks = extract_blocks(msp, doc)
    dimensions = extract_dimensions(msp)
    texts = extract_texts(msp)
    hatches = extract_hatches(msp)
    units = detect_units(doc, msp)

    result = {
        "filename": path.name,
        "units": units,
        "layers": layers,
        "entities": entities,
        "blocks": blocks,
        "dimensions": dimensions,
        "texts": texts,
        "hatches": hatches,
        "stats": {
            "total_layers": len(layers),
            "total_entities": len(entities),
            "total_blocks": len(blocks),
            "total_dimensions": len(dimensions),
            "total_texts": len(texts),
            "total_hatches": len(hatches),
        },
    }

    json.dump(result, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <dxf_path>", file=sys.stderr)
        sys.exit(1)
    main(sys.argv[1])
