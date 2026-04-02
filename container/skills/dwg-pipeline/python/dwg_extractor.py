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


def detect_units(doc: ezdxf.document.Drawing) -> str:
    """Detect drawing units from the DXF header."""
    try:
        insunits = doc.header.get("$INSUNITS", 0)
        unit_map = {
            0: "unitless",
            1: "in",
            2: "ft",
            4: "mm",
            5: "cm",
            6: "m",
        }
        return unit_map.get(insunits, "mm")
    except Exception:
        return "mm"


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
    units = detect_units(doc)

    result = {
        "filename": path.name,
        "units": units,
        "layers": layers,
        "entities": entities,
        "blocks": blocks,
        "dimensions": dimensions,
        "texts": texts,
        "stats": {
            "total_layers": len(layers),
            "total_entities": len(entities),
            "total_blocks": len(blocks),
            "total_dimensions": len(dimensions),
            "total_texts": len(texts),
        },
    }

    json.dump(result, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <dxf_path>", file=sys.stderr)
        sys.exit(1)
    main(sys.argv[1])
