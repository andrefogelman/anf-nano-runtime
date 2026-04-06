"""Tests for unit detection with bbox heuristic."""
import pytest
from unittest.mock import MagicMock

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dwg_extractor import _infer_units_from_bbox, detect_units


class FakeLine:
    def __init__(self, start, end):
        self.dxf = MagicMock()
        self.dxf.start = MagicMock(x=start[0], y=start[1])
        self.dxf.end = MagicMock(x=end[0], y=end[1])
        self.dxf.layer = "0"
    def dxftype(self):
        return "LINE"


def make_msp_with_lines(coords_pairs):
    entities = []
    for start, end in coords_pairs:
        entities.append(FakeLine(start, end))
    return entities


class TestInferUnitsFromBbox:
    def test_meters_range_small_building(self):
        lines = [((0,0),(15,0)), ((0,0),(0,10)), ((15,0),(15,10)),
                 ((0,10),(15,10)), ((5,0),(5,10)), ((0,5),(15,5)),
                 ((2,2),(8,2)), ((2,8),(8,8)), ((10,2),(14,2)),
                 ((10,8),(14,8)), ((3,3),(7,3))]
        msp = make_msp_with_lines(lines)
        assert _infer_units_from_bbox(msp) == "m"

    def test_centimeters_range(self):
        lines = [((0,0),(1500,0)), ((0,0),(0,1000)),
                 ((1500,0),(1500,1000)), ((0,1000),(1500,1000)),
                 ((500,0),(500,1000)), ((0,500),(1500,500)),
                 ((200,200),(800,200)), ((200,800),(800,800)),
                 ((1000,200),(1400,200)), ((1000,800),(1400,800)),
                 ((300,300),(700,300))]
        msp = make_msp_with_lines(lines)
        assert _infer_units_from_bbox(msp) == "cm"

    def test_millimeters_range(self):
        lines = [((0,0),(15000,0)), ((0,0),(0,10000)),
                 ((15000,0),(15000,10000)), ((0,10000),(15000,10000)),
                 ((5000,0),(5000,10000)), ((0,5000),(15000,5000)),
                 ((2000,2000),(8000,2000)), ((2000,8000),(8000,8000)),
                 ((10000,2000),(14000,2000)), ((10000,8000),(14000,8000)),
                 ((3000,3000),(7000,3000))]
        msp = make_msp_with_lines(lines)
        assert _infer_units_from_bbox(msp) == "mm"

    def test_too_few_entities_defaults_to_mm(self):
        lines = [((0,0),(100,0)), ((0,0),(0,50))]
        msp = make_msp_with_lines(lines)
        assert _infer_units_from_bbox(msp) == "mm"


class TestDetectUnits:
    def test_explicit_mm_units(self):
        doc = MagicMock()
        doc.header.get.return_value = 4
        msp = make_msp_with_lines([((0,0),(15,10))])
        assert detect_units(doc, msp) == "mm"

    def test_explicit_m_units(self):
        doc = MagicMock()
        doc.header.get.return_value = 6
        msp = make_msp_with_lines([((0,0),(15,10))])
        assert detect_units(doc, msp) == "m"

    def test_unitless_falls_through_to_bbox(self):
        doc = MagicMock()
        doc.header.get.return_value = 0
        lines = [((0,0),(15,0)), ((0,0),(0,10)), ((15,0),(15,10)),
                 ((0,10),(15,10)), ((5,0),(5,10)), ((0,5),(15,5)),
                 ((2,2),(8,2)), ((2,8),(8,8)), ((10,2),(14,2)),
                 ((10,8),(14,8)), ((3,3),(7,3))]
        msp = make_msp_with_lines(lines)
        assert detect_units(doc, msp) == "m"
