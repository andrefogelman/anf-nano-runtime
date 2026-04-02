#!/usr/bin/env python3
"""
Geometry utilities for the DWG pipeline.

Functions:
  - point_in_polygon: Ray-casting algorithm for point containment
  - associate_texts_to_rooms: Map text entities to their containing room polylines
  - normalize_units: Convert between drawing units (mm, cm, m, in, ft)
"""

from typing import Optional


def point_in_polygon(
    point: tuple[float, float],
    polygon: list[tuple[float, float]],
) -> bool:
    """
    Determine if a point is inside a polygon using the ray-casting algorithm.

    Args:
        point: (x, y) coordinates of the test point
        polygon: List of (x, y) vertices defining a closed polygon

    Returns:
        True if the point is inside the polygon
    """
    x, y = point
    n = len(polygon)
    inside = False

    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]

        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i

    return inside


def associate_texts_to_rooms(
    texts: list[dict],
    room_polylines: list[dict],
) -> dict[int, int]:
    """
    Associate text entities to room polylines by checking point-in-polygon containment.

    Args:
        texts: List of text entities with "position" as [x, y]
        room_polylines: List of polyline dicts with "vertices" as [[x,y], ...] and "is_closed" == True

    Returns:
        Dict mapping text index -> room_polyline index.
        Texts not inside any room are omitted.
    """
    result: dict[int, int] = {}

    for ti, text in enumerate(texts):
        tx, ty = text["position"][0], text["position"][1]

        for ri, room in enumerate(room_polylines):
            if not room.get("is_closed", False):
                continue
            vertices = [(v[0], v[1]) for v in room["vertices"]]
            if point_in_polygon((tx, ty), vertices):
                result[ti] = ri
                break  # First match wins (texts should be in exactly one room)

    return result


# ── Unit conversion ───────────────────────────────────────────────────────────

_TO_MM: dict[str, float] = {
    "mm": 1.0,
    "cm": 10.0,
    "m": 1000.0,
    "in": 25.4,
    "ft": 304.8,
    "unitless": 1.0,  # Assume mm if unitless
}


def normalize_units(
    value: float,
    from_unit: str,
    to_unit: str,
) -> float:
    """
    Convert a numeric value between drawing unit systems.

    Supported units: mm, cm, m, in, ft, unitless (treated as mm)

    Args:
        value: The numeric value to convert
        from_unit: Source unit system
        to_unit: Target unit system

    Returns:
        Converted value

    Raises:
        ValueError: If from_unit or to_unit is not supported
    """
    from_unit = from_unit.lower()
    to_unit = to_unit.lower()

    if from_unit not in _TO_MM:
        raise ValueError(f"Unsupported source unit: {from_unit}. Supported: {list(_TO_MM.keys())}")
    if to_unit not in _TO_MM:
        raise ValueError(f"Unsupported target unit: {to_unit}. Supported: {list(_TO_MM.keys())}")

    # Convert to mm first, then to target
    mm_value = value * _TO_MM[from_unit]
    return mm_value / _TO_MM[to_unit]


def area_to_m2(area_value: float, unit: str) -> float:
    """Convert an area value from drawing units squared to square meters."""
    # Convert linear unit factor to area factor
    linear_to_m = normalize_units(1.0, unit, "m")
    return area_value * linear_to_m * linear_to_m


def length_to_m(length_value: float, unit: str) -> float:
    """Convert a length value from drawing units to meters."""
    return normalize_units(length_value, unit, "m")
