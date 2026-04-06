# Extraction Pipeline Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 40%+ area extraction errors in DXF and PDF pipelines to make quantity takeoff reliable for professional construction budgeting.

**Architecture:** 11 fixes across 3 sub-projects: DXF precision (hatches, units, thresholds, validation, hierarchy), PDF precision (prompt rewrite, regex pre-parsing, confidence), and cross-pipeline validation. Each sub-project is independently deployable.

**Tech Stack:** TypeScript, Python 3 (ezdxf), Zod, Vitest

**Spec:** `/Users/andrefogelman/orcabot/docs/superpowers/specs/2026-04-06-extraction-pipeline-fix-design.md`

---

## Sub-Project A: DXF Pipeline

### Task 1: Add hatches to DXF schema (Fix 1)

**Files:**
- Modify: `/Users/andrefogelman/orcabot/container/skills/dwg-pipeline/src/types.ts`
- Modify: `/Users/andrefogelman/orcabot/container/skills/dwg-pipeline/tests/types.test.ts`

**Steps:**

- [ ] **Step 1.1 — Write test first.** Add test to `/Users/andrefogelman/orcabot/container/skills/dwg-pipeline/tests/types.test.ts`:

```typescript
import {
  DxfHatchSchema,
  ExtractedDxfDataSchema,
  MIN_ROOM_AREA_MM2,
} from "../src/types.js";

describe("DxfHatchSchema", () => {
  it("validates a correct hatch with vertices", () => {
    const result = DxfHatchSchema.safeParse({
      layer: "ARQ-PISO",
      pattern: "SOLID",
      area: 12500000,
      vertices: [[0, 0], [5000, 0], [5000, 2500], [0, 2500]],
    });
    expect(result.success).toBe(true);
  });

  it("validates a hatch without vertices", () => {
    const result = DxfHatchSchema.safeParse({
      layer: "ARQ-PISO",
      pattern: "AR-CONC",
      area: 8000000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects hatch missing layer", () => {
    const result = DxfHatchSchema.safeParse({
      pattern: "SOLID",
      area: 100,
    });
    expect(result.success).toBe(false);
  });
});

describe("MIN_ROOM_AREA_MM2", () => {
  it("is 500_000 (0.5 m²)", () => {
    expect(MIN_ROOM_AREA_MM2).toBe(500_000);
  });
});

describe("ExtractedDxfDataSchema with hatches", () => {
  it("accepts data with hatches and total_hatches in stats", () => {
    const data = {
      filename: "test.dxf",
      units: "mm",
      layers: [],
      entities: [],
      blocks: [],
      dimensions: [],
      texts: [],
      hatches: [
        { layer: "ARQ-PISO", pattern: "SOLID", area: 12500000, vertices: [[0, 0], [100, 0]] },
      ],
      stats: {
        total_layers: 0,
        total_entities: 0,
        total_blocks: 0,
        total_dimensions: 0,
        total_texts: 0,
        total_hatches: 1,
      },
    };
    const result = ExtractedDxfDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects data without hatches field", () => {
    const data = {
      filename: "test.dxf",
      units: "mm",
      layers: [],
      entities: [],
      blocks: [],
      dimensions: [],
      texts: [],
      stats: {
        total_layers: 0,
        total_entities: 0,
        total_blocks: 0,
        total_dimensions: 0,
        total_texts: 0,
      },
    };
    const result = ExtractedDxfDataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 1.2 — Run test, verify it fails.**

```bash
cd /Users/andrefogelman/orcabot && bun run test container/skills/dwg-pipeline/tests/types.test.ts
```

Expected: Tests fail because `DxfHatchSchema`, `MIN_ROOM_AREA_MM2` don't exist and `ExtractedDxfDataSchema` doesn't have `hatches` or `total_hatches`.

- [ ] **Step 1.3 — Implement.** In `/Users/andrefogelman/orcabot/container/skills/dwg-pipeline/src/types.ts`, add the hatch schema and constant.

After the existing `DxfTextSchema` type export (line 141), add:

```typescript
// --- DXF Hatch ---

export const DxfHatchSchema = z.object({
  layer: z.string(),
  pattern: z.string(),
  area: z.number(),
  vertices: z.array(z.array(z.number()).length(2)).optional(),
});
export type DxfHatch = z.infer<typeof DxfHatchSchema>;

/** Minimum area in mm² to consider a closed polyline as a room boundary */
export const MIN_ROOM_AREA_MM2 = 500_000; // 0.5 m²
```

Then modify `ExtractedDxfDataSchema` (currently lines 145-161) to include hatches:

Change from:
```typescript
export const ExtractedDxfDataSchema = z.object({
  filename: z.string(),
  units: z.string().describe("Drawing units: mm, cm, m, in, ft"),
  layers: z.array(DxfLayerSchema),
  entities: z.array(DxfEntitySchema),
  blocks: z.array(DxfBlockSchema),
  dimensions: z.array(DxfDimensionSchema),
  texts: z.array(DxfTextSchema),
  stats: z.object({
    total_layers: z.number(),
    total_entities: z.number(),
    total_blocks: z.number(),
    total_dimensions: z.number(),
    total_texts: z.number(),
  }),
});
```

To:
```typescript
export const ExtractedDxfDataSchema = z.object({
  filename: z.string(),
  units: z.string().describe("Drawing units: mm, cm, m, in, ft"),
  layers: z.array(DxfLayerSchema),
  entities: z.array(DxfEntitySchema),
  blocks: z.array(DxfBlockSchema),
  dimensions: z.array(DxfDimensionSchema),
  texts: z.array(DxfTextSchema),
  hatches: z.array(DxfHatchSchema),
  stats: z.object({
    total_layers: z.number(),
    total_entities: z.number(),
    total_blocks: z.number(),
    total_dimensions: z.number(),
    total_texts: z.number(),
    total_hatches: z.number(),
  }),
});
```

- [ ] **Step 1.4 — Run test, verify it passes.**

```bash
cd /Users/andrefogelman/orcabot && bun run test container/skills/dwg-pipeline/tests/types.test.ts
```

Expected: All tests pass including the new hatch-related tests.

- [ ] **Step 1.5 — Run full DWG pipeline tests to check for regressions.**

```bash
cd /Users/andrefogelman/orcabot && bun run test container/skills/dwg-pipeline/tests/
```

Expected: Some tests may fail because existing test fixtures don't include `hatches` and `total_hatches`. Fix those fixtures by adding `hatches: []` and `total_hatches: 0` to the stats objects.

- [ ] **Step 1.6 — Commit.**

```bash
git add container/skills/dwg-pipeline/src/types.ts container/skills/dwg-pipeline/tests/types.test.ts
git commit -m "feat(dwg): add DxfHatchSchema and MIN_ROOM_AREA_MM2 to types (Fix 1)"
```

---

### Task 2: Fix unit detection with bbox heuristic (Fix 2)

**Files:**
- Modify: `/Users/andrefogelman/orcabot/container/skills/dwg-pipeline/python/dwg_extractor.py`
- Create: `/Users/andrefogelman/orcabot/container/skills/dwg-pipeline/python/tests/test_unit_detection.py`

**Steps:**

- [ ] **Step 2.1 — Create Python test directory and test file.**

```bash
mkdir -p /Users/andrefogelman/orcabot/container/skills/dwg-pipeline/python/tests
touch /Users/andrefogelman/orcabot/container/skills/dwg-pipeline/python/tests/__init__.py
```

Write `/Users/andrefogelman/orcabot/container/skills/dwg-pipeline/python/tests/test_unit_detection.py`:

```python
"""Tests for unit detection with bbox heuristic."""
import pytest
from unittest.mock import MagicMock, PropertyMock


# We need to test _infer_units_from_bbox directly
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dwg_extractor import _infer_units_from_bbox, detect_units


class FakeLine:
    """Fake LINE entity for testing."""

    def __init__(self, start, end):
        self.dxf = MagicMock()
        self.dxf.start = MagicMock(x=start[0], y=start[1])
        self.dxf.end = MagicMock(x=end[0], y=end[1])
        self.dxf.layer = "0"

    def dxftype(self):
        return "LINE"


def make_msp_with_lines(coords_pairs):
    """Create a fake modelspace with LINE entities."""
    entities = []
    for start, end in coords_pairs:
        entities.append(FakeLine(start, end))
    return entities


class TestInferUnitsFromBbox:
    def test_meters_range_small_building(self):
        """BBox ~15x10 -> meters."""
        lines = [((0, 0), (15, 0)), ((0, 0), (0, 10)), ((15, 0), (15, 10)),
                 ((0, 10), (15, 10)), ((5, 0), (5, 10)), ((0, 5), (15, 5)),
                 ((2, 2), (8, 2)), ((2, 8), (8, 8)), ((10, 2), (14, 2)),
                 ((10, 8), (14, 8)), ((3, 3), (7, 3))]
        msp = make_msp_with_lines(lines)
        assert _infer_units_from_bbox(msp) == "m"

    def test_centimeters_range(self):
        """BBox ~1500x1000 -> centimeters."""
        lines = [((0, 0), (1500, 0)), ((0, 0), (0, 1000)),
                 ((1500, 0), (1500, 1000)), ((0, 1000), (1500, 1000)),
                 ((500, 0), (500, 1000)), ((0, 500), (1500, 500)),
                 ((200, 200), (800, 200)), ((200, 800), (800, 800)),
                 ((1000, 200), (1400, 200)), ((1000, 800), (1400, 800)),
                 ((300, 300), (700, 300))]
        msp = make_msp_with_lines(lines)
        assert _infer_units_from_bbox(msp) == "cm"

    def test_millimeters_range(self):
        """BBox ~15000x10000 -> millimeters."""
        lines = [((0, 0), (15000, 0)), ((0, 0), (0, 10000)),
                 ((15000, 0), (15000, 10000)), ((0, 10000), (15000, 10000)),
                 ((5000, 0), (5000, 10000)), ((0, 5000), (15000, 5000)),
                 ((2000, 2000), (8000, 2000)), ((2000, 8000), (8000, 8000)),
                 ((10000, 2000), (14000, 2000)), ((10000, 8000), (14000, 8000)),
                 ((3000, 3000), (7000, 3000))]
        msp = make_msp_with_lines(lines)
        assert _infer_units_from_bbox(msp) == "mm"

    def test_too_few_entities_defaults_to_mm(self):
        """Less than 10 entities -> default mm."""
        lines = [((0, 0), (100, 0)), ((0, 0), (0, 50))]
        msp = make_msp_with_lines(lines)
        assert _infer_units_from_bbox(msp) == "mm"


class TestDetectUnits:
    def test_explicit_mm_units(self):
        """$INSUNITS=4 -> mm regardless of bbox."""
        doc = MagicMock()
        doc.header.get.return_value = 4
        msp = make_msp_with_lines([((0, 0), (15, 10))])
        assert detect_units(doc, msp) == "mm"

    def test_explicit_m_units(self):
        """$INSUNITS=6 -> m."""
        doc = MagicMock()
        doc.header.get.return_value = 6
        msp = make_msp_with_lines([((0, 0), (15, 10))])
        assert detect_units(doc, msp) == "m"

    def test_unitless_falls_through_to_bbox(self):
        """$INSUNITS=0 -> bbox heuristic."""
        doc = MagicMock()
        doc.header.get.return_value = 0
        # Provide enough entities for bbox with dimensions in meters range
        lines = [((0, 0), (15, 0)), ((0, 0), (0, 10)), ((15, 0), (15, 10)),
                 ((0, 10), (15, 10)), ((5, 0), (5, 10)), ((0, 5), (15, 5)),
                 ((2, 2), (8, 2)), ((2, 8), (8, 8)), ((10, 2), (14, 2)),
                 ((10, 8), (14, 8)), ((3, 3), (7, 3))]
        msp = make_msp_with_lines(lines)
        assert detect_units(doc, msp) == "m"
```

- [ ] **Step 2.2 — Run test, verify it fails.**

```bash
cd /Users/andrefogelman/orcabot && python3 -m pytest container/skills/dwg-pipeline/python/tests/test_unit_detection.py -v
```

Expected: Fails because `detect_units` currently has signature `detect_units(doc)` (no `msp` param) and `_infer_units_from_bbox` doesn't exist.

- [ ] **Step 2.3 — Implement.** Modify `/Users/andrefogelman/orcabot/container/skills/dwg-pipeline/python/dwg_extractor.py`.

Replace the existing `detect_units` function (lines 369-383) with:

```python
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
        return "mm"  # Not enough data, safe default

    width = max_x - min_x
    height = max_y - min_y
    max_dim = max(width, height)

    if max_dim < 1:
        return "m"  # Suspiciously small, probably not a building
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
        unit_map = {
            1: "in", 2: "ft", 4: "mm", 5: "cm", 6: "m",
        }
        if insunits in unit_map:
            return unit_map[insunits]
    except Exception:
        pass

    # Unitless or unknown — infer from bounding box
    return _infer_units_from_bbox(msp)
```

Then update the call in `main()` (line 407). Change:

```python
    units = detect_units(doc)
```

To:

```python
    units = detect_units(doc, msp)
```

- [ ] **Step 2.4 — Run test, verify it passes.**

```bash
cd /Users/andrefogelman/orcabot && python3 -m pytest container/skills/dwg-pipeline/python/tests/test_unit_detection.py -v
```

Expected: All 7 tests pass.

- [ ] **Step 2.5 — Commit.**

```bash
git add container/skills/dwg-pipeline/python/
git commit -m "feat(dwg): smart unit detection with bbox heuristic for unitless DXFs (Fix 2)"
```

---

### Task 3: Unify area thresholds (Fix 3)

**Files:**
- Modify: `/Users/andrefogelman/orcabot/container/skills/dwg-pipeline/src/layer-classifier.ts` (line 99)
- Modify: `/Users/andrefogelman/orcabot/container/skills/dwg-pipeline/src/structured-output.ts` (line 134)

**Steps:**

- [ ] **Step 3.1 — Update layer-classifier.ts.** In `/Users/andrefogelman/orcabot/container/skills/dwg-pipeline/src/layer-classifier.ts`:

Add import at top of file (with existing imports from `./types.js`):

```typescript
import { MIN_ROOM_AREA_MM2 } from "./types.js";
```

Change line 99 from:

```typescript
      e.area > 1_000_000 // > 1m2 in mm2
```

To:

```typescript
      e.area > MIN_ROOM_AREA_MM2 // > 0.5m2 in mm2
```

- [ ] **Step 3.2 — Update structured-output.ts.** In `/Users/andrefogelman/orcabot/container/skills/dwg-pipeline/src/structured-output.ts`:

Add `MIN_ROOM_AREA_MM2` to the existing import from `./types.js` (line 16-18):

```typescript
import {
  DwgPageOutputSchema,
  CONFIDENCE_DXF_GEOMETRY,
  CONFIDENCE_TEXT_POSITION,
  MIN_ROOM_AREA_MM2,
} from "./types.js";
```

Change line 134 from:

```typescript
      e.area > 500_000 // > 0.5m2 in mm2 (to skip small decorative shapes)
```

To:

```typescript
      e.area > MIN_ROOM_AREA_MM2 // > 0.5m2 in mm2 (to skip small decorative shapes)
```

- [ ] **Step 3.3 — Run existing tests to verify no regressions.**

```bash
cd /Users/andrefogelman/orcabot && bun run test container/skills/dwg-pipeline/tests/layer-classifier.test.ts container/skills/dwg-pipeline/tests/structured-output.test.ts
```

Expected: All existing tests pass.

- [ ] **Step 3.4 — Commit.**

```bash
git add container/skills/dwg-pipeline/src/layer-classifier.ts container/skills/dwg-pipeline/src/structured-output.ts
git commit -m "refactor(dwg): unify area threshold to MIN_ROOM_AREA_MM2 constant (Fix 3)"
```

---

### Task 4: Add shared area validator (Fix 4 + Fix 10)

**Files:**
- Create: `/Users/andrefogelman/orcabot/container/skills/shared/area-validator.ts`
- Create: `/Users/andrefogelman/orcabot/container/skills/shared/area-validator.test.ts`

**Steps:**

- [ ] **Step 4.1 — Create shared directory.**

```bash
mkdir -p /Users/andrefogelman/orcabot/container/skills/shared
```

- [ ] **Step 4.2 — Write test first.** Create `/Users/andrefogelman/orcabot/container/skills/shared/area-validator.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validateArea, type AreaValidation } from "./area-validator.js";

describe("validateArea", () => {
  it("passes a normal sala (23m², perimeter 19.4m)", () => {
    const result = validateArea(23.0, 19.4, "Sala", 0.97);
    expect(result.valid).toBe(true);
    expect(result.flags).toEqual([]);
    expect(result.adjusted_confidence).toBeCloseTo(0.97, 2);
  });

  it("rejects zero area", () => {
    const result = validateArea(0, 10, "Sala", 0.97);
    expect(result.valid).toBe(false);
    expect(result.flags).toContain("area_zero");
    expect(result.adjusted_confidence).toBe(0);
  });

  it("rejects negative area", () => {
    const result = validateArea(-5, 10, "Sala", 0.97);
    expect(result.valid).toBe(false);
    expect(result.flags).toContain("area_zero");
    expect(result.adjusted_confidence).toBe(0);
  });

  it("flags area muito pequena (< 1m²)", () => {
    const result = validateArea(0.3, 2.4, "Deposito", 0.90);
    expect(result.flags).toContain("area_muito_pequena");
    expect(result.adjusted_confidence).toBeLessThan(0.90);
  });

  it("flags area muito grande (> 500m²)", () => {
    const result = validateArea(800, 120, "Quarto", 0.90);
    expect(result.flags).toContain("area_muito_grande_ambiente_unico");
    expect(result.adjusted_confidence).toBeLessThan(0.50);
  });

  it("flags degenerate polygon (very low isoperimetric ratio)", () => {
    // Area 1m² but perimeter 100m -> ratio = 4*PI*1 / 10000 = 0.00126
    const result = validateArea(1, 100, "Corredor", 0.97);
    expect(result.flags).toContain("poligono_degenerado");
    expect(result.adjusted_confidence).toBeLessThan(0.30);
  });

  it("flags inconsistent perimeter-area ratio (ratio > 1.1)", () => {
    // Area 100m², perimeter 5m -> ratio = 4*PI*100/25 = 50.27 (impossible)
    const result = validateArea(100, 5, "Sala", 0.97);
    expect(result.flags).toContain("inconsistencia_perimetro_area");
    expect(result.adjusted_confidence).toBeLessThan(0.50);
  });

  it("flags banheiro with area outside typical range", () => {
    // Banheiro with 50m² is unreasonable (range: 1.5-15, tolerance 0.75-30)
    const result = validateArea(50, 28, "Banheiro Social", 0.90);
    expect(result.flags).toContain("area_fora_range_banheiro");
    expect(result.adjusted_confidence).toBeLessThan(0.90);
  });

  it("accepts banheiro within typical range", () => {
    const result = validateArea(4.5, 8.5, "Banheiro Suite", 0.95);
    // Should not have any room-type range flags
    const roomFlags = result.flags.filter((f) => f.startsWith("area_fora_range"));
    expect(roomFlags).toHaveLength(0);
  });

  it("flags cozinha with suspiciously small area", () => {
    // Cozinha with 1m² is unreasonable (range: 4-40, tolerance 2-80)
    const result = validateArea(1.5, 5, "Cozinha", 0.90);
    expect(result.flags).toContain("area_fora_range_cozinha");
  });

  it("handles zero perimeter gracefully (skips isoperimetric check)", () => {
    const result = validateArea(20, 0, "Sala", 0.90);
    // Should not have polygon/perimeter flags
    const geoFlags = result.flags.filter(
      (f) => f === "poligono_degenerado" || f === "inconsistencia_perimetro_area"
    );
    expect(geoFlags).toHaveLength(0);
  });

  it("returns valid=true even with flags if confidence stays above 0.3", () => {
    // area_muito_pequena multiplies by 0.5 -> 0.45 > 0.3 -> still valid
    const result = validateArea(0.8, 3.6, "Deposito", 0.90);
    expect(result.flags.length).toBeGreaterThan(0);
    expect(result.valid).toBe(true);
  });
});
```

- [ ] **Step 4.3 — Run test, verify it fails.**

```bash
cd /Users/andrefogelman/orcabot && bun run test container/skills/shared/area-validator.test.ts
```

Expected: Fails because `area-validator.ts` does not exist.

- [ ] **Step 4.4 — Implement.** Create `/Users/andrefogelman/orcabot/container/skills/shared/area-validator.ts`:

```typescript
/**
 * Shared area validation for DXF and PDF pipelines.
 * Validates that extracted room areas are physically plausible
 * for Brazilian civil construction projects.
 */

export interface AreaValidation {
  valid: boolean;
  flags: string[];
  adjusted_confidence: number;
}

/**
 * Validate an extracted room area against physical plausibility rules.
 *
 * @param area_m2 - Area in square meters
 * @param perimetro_m - Perimeter in meters (0 if unknown)
 * @param nome - Room name (used for type-specific range checks)
 * @param base_confidence - Starting confidence from the extraction pipeline
 * @returns Validation result with flags and adjusted confidence
 */
export function validateArea(
  area_m2: number,
  perimetro_m: number,
  nome: string,
  base_confidence: number,
): AreaValidation {
  const flags: string[] = [];
  let confidence = base_confidence;

  // 1. Area zero or negative
  if (area_m2 <= 0) {
    return { valid: false, flags: ["area_zero"], adjusted_confidence: 0 };
  }

  // 2. Area outside realistic range (residential/commercial BR environments)
  if (area_m2 < 1.0) {
    flags.push("area_muito_pequena");
    confidence *= 0.5;
  }
  if (area_m2 > 500) {
    flags.push("area_muito_grande_ambiente_unico");
    confidence *= 0.3;
  }

  // 3. Isoperimetric ratio: 4*PI*area / perimeter^2
  // Circle = 1.0, square ~ 0.785, rectangle 2:1 ~ 0.698
  // Below 0.05 = degenerate polygon, above 1.1 = impossible
  if (perimetro_m > 0) {
    const ratio = (4 * Math.PI * area_m2) / (perimetro_m * perimetro_m);
    if (ratio < 0.05) {
      flags.push("poligono_degenerado");
      confidence *= 0.2;
    } else if (ratio > 1.1) {
      flags.push("inconsistencia_perimetro_area");
      confidence *= 0.3;
    }
  }

  // 4. Ranges by room type (BR heuristics)
  const ranges: Record<string, [number, number]> = {
    banheiro: [1.5, 15],
    wc: [1.0, 6],
    lavabo: [1.0, 6],
    cozinha: [4, 40],
    sala: [8, 100],
    quarto: [6, 40],
    suite: [8, 50],
    varanda: [2, 40],
    garagem: [10, 80],
    "area de servico": [2, 15],
    circulacao: [1, 30],
    hall: [2, 30],
    deposito: [1, 20],
    despensa: [1, 10],
  };

  const nomeLower = nome.toLowerCase();
  for (const [tipo, [min, max]] of Object.entries(ranges)) {
    if (nomeLower.includes(tipo)) {
      if (area_m2 < min * 0.5 || area_m2 > max * 2) {
        flags.push(`area_fora_range_${tipo}`);
        confidence *= 0.5;
      }
      break;
    }
  }

  return {
    valid: flags.length === 0 || confidence > 0.3,
    flags,
    adjusted_confidence: Math.max(0, Math.min(1, confidence)),
  };
}
```

- [ ] **Step 4.5 — Run test, verify it passes.**

```bash
cd /Users/andrefogelman/orcabot && bun run test container/skills/shared/area-validator.test.ts
```

Expected: All 12 tests pass.

- [ ] **Step 4.6 — Commit.**

```bash
git add container/skills/shared/
git commit -m "feat(shared): add area-validator with isoperimetric and room-type checks (Fix 4+10)"
```

---

### Task 5: Integrate hatches as primary area source (Fix 5)

**Files:**
- Modify: `/Users/andrefogelman/orcabot/container/skills/dwg-pipeline/src/structured-output.ts`
- Modify: `/Users/andrefogelman/orcabot/container/skills/dwg-pipeline/tests/structured-output.test.ts`

**Steps:**

- [ ] **Step 5.1 — Write test.** Add to `/Users/andrefogelman/orcabot/container/skills/dwg-pipeline/tests/structured-output.test.ts`. Import `assembleOutput` and create test data with hatches that overlap polylines:

```typescript
describe("buildAmbientes with hatch integration", () => {
  it("uses hatch area when available instead of polyline area", async () => {
    // This test requires:
    // 1. A classified layer as "arq"
    // 2. A closed polyline on that layer with area X
    // 3. A hatch on that layer with area Y (more precise)
    // 4. The ambiente should have area Y (from hatch), not X
    const data = {
      filename: "test.dxf",
      units: "mm",
      layers: [{ name: "ARQ-PAREDE", color: 7, is_on: true, is_frozen: false, entity_counts: { LWPOLYLINE: 1 } }],
      entities: [
        {
          type: "LWPOLYLINE" as const,
          layer: "ARQ-PAREDE",
          vertices: [[0, 0], [5000, 0], [5000, 4000], [0, 4000]] as [number, number][],
          is_closed: true,
          length: 18000,
          area: 20_000_000, // 20m² in mm²
        },
      ],
      blocks: [],
      dimensions: [],
      texts: [
        { type: "TEXT" as const, content: "SALA", position: [2500, 2000] as [number, number], height: 200, rotation: 0, layer: "ARQ-PAREDE" },
      ],
      hatches: [
        {
          layer: "ARQ-PAREDE",
          pattern: "SOLID",
          area: 19_500_000, // 19.5m² in mm² (more precise from fill)
          vertices: [[100, 100], [4900, 100], [4900, 3900], [100, 3900]],
        },
      ],
      stats: {
        total_layers: 1,
        total_entities: 1,
        total_blocks: 0,
        total_dimensions: 0,
        total_texts: 1,
        total_hatches: 1,
      },
    };

    const classifiedLayers = [
      { name: "ARQ-PAREDE", disciplina: "arq" as const, confidence: 0.95, method: "regex" as const },
    ];

    const result = await assembleOutput(data as any, classifiedLayers, []);

    expect(result.ambientes.length).toBeGreaterThanOrEqual(1);
    const sala = result.ambientes.find((a) => a.nome === "SALA");
    expect(sala).toBeDefined();
    // Should use hatch area (19.5m²) not polyline area (20m²)
    expect(sala!.area_m2).toBeCloseTo(19.5, 0);
  });
});
```

- [ ] **Step 5.2 — Run test, verify it fails (ambient still uses polyline area).**

```bash
cd /Users/andrefogelman/orcabot && bun run test container/skills/dwg-pipeline/tests/structured-output.test.ts
```

Expected: Test fails because `area_m2` is 20.0 (from polyline), not 19.5 (from hatch).

- [ ] **Step 5.3 — Implement hatch integration.** Modify `/Users/andrefogelman/orcabot/container/skills/dwg-pipeline/src/structured-output.ts`.

Add import for the area validator and DxfHatch type at top of file:

```typescript
import type {
  ExtractedDxfData,
  ClassifiedLayer,
  MappedBlock,
  DwgPageOutput,
  DwgBloco,
  DwgTubulacao,
  Ambiente,
  Abertura,
  DxfEntity,
  DxfText,
  DxfHatch,
} from "./types.js";
import {
  DwgPageOutputSchema,
  CONFIDENCE_DXF_GEOMETRY,
  CONFIDENCE_TEXT_POSITION,
  MIN_ROOM_AREA_MM2,
} from "./types.js";
import { associateTextsToRooms } from "./extractor.js";
import { validateArea } from "../../shared/area-validator.js";
```

Add helper function to compute centroid and check if a point is inside a polygon:

```typescript
/**
 * Compute the centroid of a set of 2D points.
 */
function centroid(vertices: number[][]): [number, number] {
  let cx = 0, cy = 0;
  for (const v of vertices) {
    cx += v[0];
    cy += v[1];
  }
  return [cx / vertices.length, cy / vertices.length];
}

/**
 * Ray-casting point-in-polygon test.
 */
function pointInPolygon(px: number, py: number, polygon: [number, number][]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Find the best matching hatch for a room polyline.
 * Returns the hatch whose centroid is inside the polyline, or undefined.
 */
function findMatchingHatch(
  poly: DxfEntity,
  hatches: DxfHatch[],
  usedHatches: Set<number>,
): { hatch: DxfHatch; index: number } | undefined {
  if (!poly.vertices || poly.vertices.length < 3) return undefined;

  const polyVerts = poly.vertices as [number, number][];

  for (let i = 0; i < hatches.length; i++) {
    if (usedHatches.has(i)) continue;
    const hatch = hatches[i];
    if (!hatch.vertices || hatch.vertices.length < 3) continue;

    const [cx, cy] = centroid(hatch.vertices);
    if (pointInPolygon(cx, cy, polyVerts)) {
      return { hatch, index: i };
    }
  }

  return undefined;
}
```

Then modify `buildAmbientes()` to use hatches. In the function body, after the `roomPolylines` filter (around line 128-135), add hatch collection:

```typescript
  // Collect hatches on architectural layers
  const arqHatches = (data.hatches ?? []).filter(
    (h) => arqLayers.has(h.layer) && toSquareMeters(h.area, data.units) > 0.5
  );
  const usedHatches = new Set<number>();
```

Then in the loop that builds each ambiente (the `for` loop over `roomPolylines`), after computing `area_m2` and `perimetro_m`, add hatch matching:

```typescript
    // Check for matching hatch (more precise area source)
    let final_area_m2 = area_m2;
    let area_source: "polyline" | "hatch" | "hatch+polyline" = "polyline";
    const matchingHatch = findMatchingHatch(poly, arqHatches, usedHatches);
    if (matchingHatch) {
      usedHatches.add(matchingHatch.index);
      const hatchArea = toSquareMeters(matchingHatch.hatch.area, data.units);
      if (hatchArea > 0.5) {
        final_area_m2 = hatchArea;
        area_source = "hatch+polyline";
      }
    }

    // Validate area
    const validation = validateArea(final_area_m2, perimetro_m, roomName, CONFIDENCE_DXF_GEOMETRY);
```

Replace the `area_m2` in the `ambientes.push()` call with `final_area_m2`, and use `validation.adjusted_confidence` for confidence:

```typescript
    ambientes.push({
      nome: roomName,
      area_m2: Math.round(final_area_m2 * 100) / 100,
      perimetro_m: Math.round(perimetro_m * 100) / 100,
      pe_direito_m: peDireito,
      acabamentos: {
        piso: extractAcabamento(roomTexts, "piso") || "a definir",
        parede: extractAcabamento(roomTexts, "parede") || "a definir",
        forro: extractAcabamento(roomTexts, "forro") || "a definir",
      },
      aberturas,
      confidence: validation.adjusted_confidence,
    });
```

- [ ] **Step 5.4 — Run test, verify it passes.**

```bash
cd /Users/andrefogelman/orcabot && bun run test container/skills/dwg-pipeline/tests/structured-output.test.ts
```

Expected: All tests pass, including the new hatch integration test.

- [ ] **Step 5.5 — Run full DWG pipeline tests.**

```bash
cd /Users/andrefogelman/orcabot && bun run test container/skills/dwg-pipeline/tests/
```

Expected: All tests pass.

- [ ] **Step 5.6 — Commit.**

```bash
git add container/skills/dwg-pipeline/src/structured-output.ts container/skills/dwg-pipeline/tests/structured-output.test.ts
git commit -m "feat(dwg): integrate hatches as primary area source with validation (Fix 5)"
```

---

## Sub-Project B: PDF Pipeline

### Task 6: Rewrite interpretation prompt (Fix 6)

**Files:**
- Modify: `/Users/andrefogelman/orcabot/container/skills/pdf-pipeline/src/prompts.ts`
- Modify: `/Users/andrefogelman/orcabot/container/skills/pdf-pipeline/tests/interpretation.test.ts` (add snapshot test)

**Steps:**

- [ ] **Step 6.1 — Write snapshot test.** Add to `/Users/andrefogelman/orcabot/container/skills/pdf-pipeline/tests/interpretation.test.ts`:

```typescript
import { INTERPRETATION_SYSTEM_PROMPT } from "../src/prompts.js";

describe("INTERPRETATION_SYSTEM_PROMPT", () => {
  it("includes Brazilian notation rules", () => {
    expect(INTERPRETATION_SYSTEM_PROMPT).toContain("NOTAÇÃO BRASILEIRA");
    expect(INTERPRETATION_SYSTEM_PROMPT).toContain("Vírgula é separador decimal");
  });

  it("includes calculation rules", () => {
    expect(INTERPRETATION_SYSTEM_PROMPT).toContain("CÁLCULO DE ÁREAS");
    expect(INTERPRETATION_SYSTEM_PROMPT).toContain("NUNCA inventar ou estimar");
  });

  it("includes confidence scale", () => {
    expect(INTERPRETATION_SYSTEM_PROMPT).toContain("0.90-1.00");
    expect(INTERPRETATION_SYSTEM_PROMPT).toContain("0.00-0.49");
  });

  it("includes example calculation", () => {
    expect(INTERPRETATION_SYSTEM_PROMPT).toContain("4.20 × 5.50 = 23.10");
  });
});
```

- [ ] **Step 6.2 — Run test, verify it fails (current prompt doesn't have these strings).**

```bash
cd /Users/andrefogelman/orcabot && bun run test container/skills/pdf-pipeline/tests/interpretation.test.ts
```

Expected: Tests fail because current prompt uses English and doesn't have the BR-specific content.

- [ ] **Step 6.3 — Implement.** Replace `INTERPRETATION_SYSTEM_PROMPT` in `/Users/andrefogelman/orcabot/container/skills/pdf-pipeline/src/prompts.ts` (lines 51-116).

Replace the entire `export const INTERPRETATION_SYSTEM_PROMPT = ...` block with:

```typescript
export const INTERPRETATION_SYSTEM_PROMPT = `Você é um especialista em leitura de projetos de construção civil brasileira.

Você recebe:
1. Uma IMAGEM de uma prancha de projeto
2. O TEXTO extraído dessa prancha
3. A CLASSIFICAÇÃO da prancha (tipo, ID, pavimento)
4. COTAS DETECTADAS automaticamente (se houver)

REGRAS CRÍTICAS DE EXTRAÇÃO:

1. NOTAÇÃO BRASILEIRA:
   - Vírgula é separador decimal: "5,50" = 5.50 metros
   - Ponto pode ser separador de milhar: "1.250" = 1250
   - Símbolo de área: m², M2, m2
   - Cotas em metros por padrão em plantas baixas

2. CÁLCULO DE ÁREAS:
   - Se encontrar cotas de largura × comprimento: calcular área = largura × comprimento
   - Se encontrar área explícita (ex: "A=25,50m²"): usar diretamente
   - Se encontrar apenas uma dimensão: NÃO calcular, marcar confidence 0.0
   - NUNCA inventar ou estimar áreas — se não encontrar dados, confidence = 0.0

3. COMO LER COTAS EM PLANTAS BAIXAS:
   - Cotas são linhas com valores numéricos nas extremidades
   - Cotas externas dão dimensões totais do ambiente
   - Cotas internas subdividem o ambiente
   - A largura total de um cômodo é a soma das cotas parciais naquela direção

4. PERÍMETRO:
   - Somar todas as cotas que formam o contorno do ambiente
   - Se não encontrar todas as cotas: perimetro_m = 0, confidence reduzido

5. CONFIDENCE:
   - 0.90-1.00: cotas claramente legíveis, cálculo direto
   - 0.70-0.89: cotas legíveis mas alguma inferência necessária
   - 0.50-0.69: parcialmente legível, incerto
   - 0.00-0.49: dados insuficientes para calcular

EXEMPLO:
Uma planta baixa mostra:
- "SALA" com cotas 4,20 e 5,50
- area_m2 = 4.20 × 5.50 = 23.10
- perimetro_m = 2 × (4.20 + 5.50) = 19.40
- confidence = 0.95

Responda APENAS com um JSON:
{
  "ambientes": [
    {
      "nome": "string",
      "area_m2": number,
      "perimetro_m": number,
      "pe_direito_m": number,
      "acabamentos": {
        "piso": "string",
        "parede": "string",
        "forro": "string",
        "rodape": "string (optional)",
        "soleira": "string (optional)"
      },
      "aberturas": [
        { "tipo": "porta|janela|portao|basculante|maxim-ar|outro", "dim": "LxA", "qtd": number, "codigo": "P1 (optional)" }
      ],
      "confidence": number
    }
  ],
  "needs_review": [
    {
      "ambiente": "nome do ambiente",
      "campo": "campo incerto",
      "motivo": "explicação em português",
      "confidence": number
    }
  ]
}`;
```

- [ ] **Step 6.4 — Run test, verify it passes.**

```bash
cd /Users/andrefogelman/orcabot && bun run test container/skills/pdf-pipeline/tests/interpretation.test.ts
```

Expected: All tests pass.

- [ ] **Step 6.5 — Commit.**

```bash
git add container/skills/pdf-pipeline/src/prompts.ts container/skills/pdf-pipeline/tests/interpretation.test.ts
git commit -m "feat(pdf): rewrite interpretation prompt with BR notation rules (Fix 6)"
```

---

### Task 7: Add regex cota detection (Fix 7)

**Files:**
- Modify: `/Users/andrefogelman/orcabot/container/skills/pdf-pipeline/src/interpretation.ts`
- Modify: `/Users/andrefogelman/orcabot/container/skills/pdf-pipeline/tests/interpretation.test.ts`

**Steps:**

- [ ] **Step 7.1 — Write test.** Add to `/Users/andrefogelman/orcabot/container/skills/pdf-pipeline/tests/interpretation.test.ts`:

```typescript
import { detectCotas, buildInterpretationPrompt } from "../src/interpretation.js";

describe("detectCotas", () => {
  it("detects pair dimensions with comma decimal (BR)", () => {
    const cotas = detectCotas("SALA 4,20 x 5,50");
    const pairs = cotas.filter((c) => c.type === "pair");
    expect(pairs).toHaveLength(1);
    expect(pairs[0].value1_m).toBeCloseTo(4.2, 2);
    expect(pairs[0].value2_m).toBeCloseTo(5.5, 2);
    expect(pairs[0].area_m2).toBeCloseTo(23.1, 1);
  });

  it("detects pair dimensions with dot decimal", () => {
    const cotas = detectCotas("Room 4.20 x 5.50");
    const pairs = cotas.filter((c) => c.type === "pair");
    expect(pairs).toHaveLength(1);
    expect(pairs[0].area_m2).toBeCloseTo(23.1, 1);
  });

  it("detects direct area A=25,50m²", () => {
    const cotas = detectCotas("Cozinha A=25,50m²");
    const areas = cotas.filter((c) => c.type === "area_direct");
    expect(areas).toHaveLength(1);
    expect(areas[0].area_m2).toBeCloseTo(25.5, 1);
  });

  it("detects direct area 12,80 m²", () => {
    const cotas = detectCotas("Banheiro 12,80 m²");
    const areas = cotas.filter((c) => c.type === "area_direct");
    expect(areas).toHaveLength(1);
    expect(areas[0].area_m2).toBeCloseTo(12.8, 1);
  });

  it("detects standalone dimension in plausible range", () => {
    const cotas = detectCotas("cota interna 3,50 marca");
    const dims = cotas.filter((c) => c.type === "dimension");
    expect(dims.length).toBeGreaterThanOrEqual(1);
    expect(dims[0].value1_m).toBeCloseTo(3.5, 2);
  });

  it("ignores implausible standalone dimensions", () => {
    const cotas = detectCotas("codigo 0,01 referencia 999,99");
    const dims = cotas.filter((c) => c.type === "dimension");
    // 0.01 is < 0.3, 999.99 is > 50 -> both filtered
    expect(dims).toHaveLength(0);
  });

  it("returns empty for text without numbers", () => {
    const cotas = detectCotas("Planta Baixa - Pavimento Terreo");
    expect(cotas).toHaveLength(0);
  });

  it("detects × (multiplication sign) separator", () => {
    const cotas = detectCotas("3,00 × 4,00");
    const pairs = cotas.filter((c) => c.type === "pair");
    expect(pairs).toHaveLength(1);
    expect(pairs[0].area_m2).toBeCloseTo(12.0, 1);
  });
});

describe("buildInterpretationPrompt with cotas", () => {
  it("includes detected cotas section when text has dimensions", () => {
    const page = {
      page_number: 1,
      tipo: "arquitetonico-planta-baixa" as const,
      prancha: "ARQ-01",
      pavimento: "terreo",
      classification_confidence: 0.95,
      text_content: "SALA 4,20 x 5,50 COZINHA A=12,00m²",
    };
    const prompt = buildInterpretationPrompt(page as any);
    expect(prompt).toContain("COTAS DETECTADAS");
    expect(prompt).toContain("23.10");
    expect(prompt).toContain("12.00");
  });

  it("shows no cotas message when text has no dimensions", () => {
    const page = {
      page_number: 1,
      tipo: "capa" as const,
      prancha: "UNKNOWN",
      pavimento: "indefinido",
      classification_confidence: 0.50,
      text_content: "PROJETO RESIDENCIAL UNIFAMILIAR",
    };
    const prompt = buildInterpretationPrompt(page as any);
    expect(prompt).toContain("NENHUMA COTA DETECTADA");
  });
});
```

- [ ] **Step 7.2 — Run test, verify it fails.**

```bash
cd /Users/andrefogelman/orcabot && bun run test container/skills/pdf-pipeline/tests/interpretation.test.ts
```

Expected: Fails because `detectCotas` is not exported and `buildInterpretationPrompt` doesn't include cotas.

- [ ] **Step 7.3 — Implement.** Modify `/Users/andrefogelman/orcabot/container/skills/pdf-pipeline/src/interpretation.ts`.

Add at top of file (after existing imports):

```typescript
export interface DetectedCota {
  raw: string;
  value1_m: number;
  value2_m?: number;
  area_m2?: number;
  type: "dimension" | "area_direct" | "pair";
}

/**
 * Detect dimension cotas in extracted text using regex patterns.
 * Pre-processes text before LLM to provide structured dimension hints.
 */
export function detectCotas(text: string): DetectedCota[] {
  const cotas: DetectedCota[] = [];

  // Pattern 1: "4,20 x 5,50" or "4.20 x 5.50" (pair of dimensions)
  const pairPattern = /(\d+[.,]\d+)\s*[xX×]\s*(\d+[.,]\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = pairPattern.exec(text)) !== null) {
    const v1 = parseFloat(match[1].replace(",", "."));
    const v2 = parseFloat(match[2].replace(",", "."));
    cotas.push({
      raw: match[0],
      value1_m: v1,
      value2_m: v2,
      area_m2: v1 * v2,
      type: "pair",
    });
  }

  // Pattern 2: "A=25,50m²" or "25,50 m²" or "25.50m2" (direct area)
  const areaPattern = /(?:A\s*=\s*)?(\d+[.,]\d+)\s*(?:m²|m2|M2|M²)/g;
  while ((match = areaPattern.exec(text)) !== null) {
    const area = parseFloat(match[1].replace(",", "."));
    cotas.push({
      raw: match[0],
      value1_m: area,
      area_m2: area,
      type: "area_direct",
    });
  }

  // Pattern 3: standalone dimensions "4,20" near meter context
  const dimPattern = /\b(\d{1,3}[.,]\d{2})\b/g;
  while ((match = dimPattern.exec(text)) !== null) {
    const val = parseFloat(match[1].replace(",", "."));
    if (val >= 0.3 && val <= 50) {
      // Avoid duplicates — skip if this raw string was already captured
      const raw = match[0];
      const isDuplicate = cotas.some(
        (c) => c.raw.includes(raw) || raw.includes(c.raw)
      );
      if (!isDuplicate) {
        cotas.push({
          raw,
          value1_m: val,
          type: "dimension",
        });
      }
    }
  }

  return cotas;
}
```

Replace the existing `buildInterpretationPrompt` function with:

```typescript
/**
 * Build the user prompt for interpretation, including classification context
 * and pre-detected cotas from regex.
 */
export function buildInterpretationPrompt(page: ClassifiedPage): string {
  const cotas = detectCotas(page.text_content);
  const cotasSection =
    cotas.length > 0
      ? `\n--- COTAS DETECTADAS AUTOMATICAMENTE ---\n${cotas
          .map((c) =>
            c.type === "pair"
              ? `Dimensão: ${c.raw} → área = ${c.area_m2?.toFixed(2)}m²`
              : c.type === "area_direct"
                ? `Área explícita: ${c.raw}`
                : `Cota: ${c.raw} = ${c.value1_m}m`
          )
          .join("\n")}\n--- FIM COTAS ---\n`
      : "\n--- NENHUMA COTA DETECTADA NO TEXTO ---\n";

  return `Interprete esta prancha de construção e extraia dados estruturados.

CLASSIFICAÇÃO:
- Tipo: ${page.tipo}
- Prancha: ${page.prancha}
- Pavimento: ${page.pavimento}
- Confiança classificação: ${page.classification_confidence}
${cotasSection}
--- TEXTO EXTRAÍDO ---
${page.text_content}
--- FIM TEXTO ---

Analise a imagem E o texto acima. Extraia todos os ambientes com dimensões, acabamentos e aberturas. Use as cotas detectadas automaticamente como referência. Marque itens incertos em needs_review.`;
}
```

- [ ] **Step 7.4 — Run test, verify it passes.**

```bash
cd /Users/andrefogelman/orcabot && bun run test container/skills/pdf-pipeline/tests/interpretation.test.ts
```

Expected: All tests pass.

- [ ] **Step 7.5 — Commit.**

```bash
git add container/skills/pdf-pipeline/src/interpretation.ts container/skills/pdf-pipeline/tests/interpretation.test.ts
git commit -m "feat(pdf): add regex cota pre-detection before LLM interpretation (Fix 7)"
```

---

### Task 8: Fix confidence to use minimum (Fix 8)

**Files:**
- Modify: `/Users/andrefogelman/orcabot/container/skills/pdf-pipeline/src/confidence.ts`
- Modify: `/Users/andrefogelman/orcabot/container/skills/pdf-pipeline/tests/confidence.test.ts`

**Steps:**

- [ ] **Step 8.1 — Update test.** In `/Users/andrefogelman/orcabot/container/skills/pdf-pipeline/tests/confidence.test.ts`, the existing test on line 28 checks for average (0.85). Change it to check for minimum:

Change:
```typescript
  it("returns average of ambiente confidences", () => {
```

To:
```typescript
  it("returns minimum of ambiente confidences", () => {
```

And change the expected value:
```typescript
    expect(score).toBeCloseTo(0.80, 2); // min of 0.9 and 0.8
```

Also add a test that specifically verifies minimum behavior:

```typescript
  it("uses minimum not average — one low outlier tanks the score", () => {
    const ambientes: Ambiente[] = [
      { nome: "Sala", area_m2: 18.5, perimetro_m: 17.4, pe_direito_m: 2.8, acabamentos: { piso: "x", parede: "x", forro: "x" }, aberturas: [], confidence: 0.95 },
      { nome: "Cozinha", area_m2: 12.0, perimetro_m: 14.0, pe_direito_m: 2.8, acabamentos: { piso: "x", parede: "x", forro: "x" }, aberturas: [], confidence: 0.95 },
      { nome: "Quarto", area_m2: 10.0, perimetro_m: 13.0, pe_direito_m: 2.8, acabamentos: { piso: "x", parede: "x", forro: "x" }, aberturas: [], confidence: 0.95 },
      { nome: "Banheiro", area_m2: 4.0, perimetro_m: 8.0, pe_direito_m: 2.8, acabamentos: { piso: "x", parede: "x", forro: "x" }, aberturas: [], confidence: 0.20 },
      { nome: "Varanda", area_m2: 8.0, perimetro_m: 12.0, pe_direito_m: 2.8, acabamentos: { piso: "x", parede: "x", forro: "x" }, aberturas: [], confidence: 0.95 },
    ];
    const score = computePageConfidence(ambientes);
    // Average would be 0.80, but minimum should be 0.20
    expect(score).toBeCloseTo(0.20, 2);
  });
```

- [ ] **Step 8.2 — Run test, verify it fails (still using average).**

```bash
cd /Users/andrefogelman/orcabot && bun run test container/skills/pdf-pipeline/tests/confidence.test.ts
```

Expected: Fails because `computePageConfidence` returns average, not minimum.

- [ ] **Step 8.3 — Implement.** In `/Users/andrefogelman/orcabot/container/skills/pdf-pipeline/src/confidence.ts`, change `computePageConfidence`:

Replace:
```typescript
export function computePageConfidence(ambientes: Ambiente[]): number {
  if (ambientes.length === 0) return 0;
  const sum = ambientes.reduce((acc, amb) => acc + amb.confidence, 0);
  return sum / ambientes.length;
}
```

With:
```typescript
/**
 * Compute overall page confidence as the minimum of ambiente confidences.
 * A single uncertain room should make the entire page flagged for review,
 * not hidden by averaging with high-confidence rooms.
 */
export function computePageConfidence(ambientes: Ambiente[]): number {
  if (ambientes.length === 0) return 0;
  return Math.min(...ambientes.map((amb) => amb.confidence));
}
```

- [ ] **Step 8.4 — Run test, verify it passes.**

```bash
cd /Users/andrefogelman/orcabot && bun run test container/skills/pdf-pipeline/tests/confidence.test.ts
```

Expected: All tests pass.

- [ ] **Step 8.5 — Commit.**

```bash
git add container/skills/pdf-pipeline/src/confidence.ts container/skills/pdf-pipeline/tests/confidence.test.ts
git commit -m "fix(pdf): use minimum confidence instead of average per page (Fix 8)"
```

---

### Task 9: PDF pipeline supports Gemini (Fix 9)

**Files:**
- Modify: `/Users/andrefogelman/orcabot/container/skills/pdf-pipeline/src/interpretation.ts`
- Modify: `/Users/andrefogelman/orcabot/container/skills/pdf-pipeline/tests/interpretation.test.ts`

**Steps:**

- [ ] **Step 9.1 — Write test.** Add to `/Users/andrefogelman/orcabot/container/skills/pdf-pipeline/tests/interpretation.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("interpretPage provider selection", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("calls Gemini API when LLM_PROVIDER=gemini", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.LLM_MODEL = "gemini-2.5-pro-preview-05-06";
    process.env.GOOGLE_API_KEY = "test-key";

    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  ambientes: [
                    {
                      nome: "Sala",
                      area_m2: 23.1,
                      perimetro_m: 19.4,
                      pe_direito_m: 2.8,
                      acabamentos: { piso: "porcelanato", parede: "pintura", forro: "gesso" },
                      aberturas: [],
                      confidence: 0.9,
                    },
                  ],
                  needs_review: [],
                }),
              },
            ],
          },
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    );

    // We need to mock readFile too
    const fs = await import("node:fs/promises");
    vi.spyOn(fs, "readFile").mockResolvedValue(Buffer.from("fake-image-data"));

    const { interpretPage } = await import("../src/interpretation.js");

    const page = {
      page_number: 1,
      tipo: "arquitetonico-planta-baixa" as const,
      prancha: "ARQ-01",
      pavimento: "terreo",
      classification_confidence: 0.95,
      text_content: "SALA 4,20 x 5,50",
    };

    const result = await interpretPage(page as any, "/tmp/test.png");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url] = fetchSpy.mock.calls[0];
    expect(url).toContain("generativelanguage.googleapis.com");
    expect(url).toContain("gemini-2.5-pro-preview-05-06");
    expect(result.ambientes).toHaveLength(1);
    expect(result.ambientes[0].nome).toBe("Sala");
  });

  it("calls Anthropic API when LLM_PROVIDER is not set", async () => {
    delete process.env.LLM_PROVIDER;
    process.env.ANTHROPIC_BASE_URL = "http://test-proxy:8100";
    process.env.ANTHROPIC_AUTH_TOKEN = "test-token";

    const mockResponse = {
      content: [
        {
          text: JSON.stringify({
            ambientes: [],
            needs_review: [],
          }),
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    );

    const fs = await import("node:fs/promises");
    vi.spyOn(fs, "readFile").mockResolvedValue(Buffer.from("fake-image-data"));

    const { interpretPage } = await import("../src/interpretation.js");

    const page = {
      page_number: 1,
      tipo: "arquitetonico-planta-baixa" as const,
      prancha: "ARQ-01",
      pavimento: "terreo",
      classification_confidence: 0.95,
      text_content: "SALA",
    };

    const result = await interpretPage(page as any, "/tmp/test.png");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url] = fetchSpy.mock.calls[0];
    expect(url).toContain("test-proxy:8100");
  });
});
```

- [ ] **Step 9.2 — Run test, verify it fails.**

```bash
cd /Users/andrefogelman/orcabot && bun run test container/skills/pdf-pipeline/tests/interpretation.test.ts
```

Expected: Fails because `interpretPage` always calls Anthropic.

- [ ] **Step 9.3 — Implement.** Modify `/Users/andrefogelman/orcabot/container/skills/pdf-pipeline/src/interpretation.ts`.

Replace the `interpretPage` function (lines 78-141) with:

```typescript
/**
 * Call Gemini API for vision-based interpretation.
 */
async function callGemini(
  imageBase64: string,
  mediaType: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY ?? "";
  const model = process.env.LLM_MODEL ?? "gemini-2.5-pro-preview-05-06";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: mediaType,
                data: imageBase64,
              },
            },
            { text: userPrompt },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as any;
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

/**
 * Call Anthropic API (via proxy) for vision-based interpretation.
 */
async function callAnthropic(
  imageBase64: string,
  mediaType: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const baseUrl = process.env.ANTHROPIC_BASE_URL ?? "http://localhost:8100";
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN ?? "";
  const model = process.env.LLM_MODEL ?? "claude-haiku-4-5-20251001";

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": authToken,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: userPrompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as any;
  return data.content?.[0]?.text ?? "";
}

/**
 * Interpret a single classified page using vision LLM.
 * Supports Gemini (LLM_PROVIDER=gemini) and Anthropic (default).
 */
export async function interpretPage(
  page: ClassifiedPage,
  imagePath: string
): Promise<InterpretedPage> {
  const imageBuffer = await readFile(imagePath);
  const imageBase64 = imageBuffer.toString("base64");
  const mediaType = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";
  const userPrompt = buildInterpretationPrompt(page);
  const provider = process.env.LLM_PROVIDER ?? "anthropic";

  let text: string;
  if (provider === "gemini") {
    text = await callGemini(imageBase64, mediaType, INTERPRETATION_SYSTEM_PROMPT, userPrompt);
  } else {
    text = await callAnthropic(imageBase64, mediaType, INTERPRETATION_SYSTEM_PROMPT, userPrompt);
  }

  const result = parseInterpretationResponse(text);

  return {
    ...page,
    ambientes: result.ambientes,
    needs_review: result.needs_review,
    image_path: imagePath,
  };
}
```

- [ ] **Step 9.4 — Run test, verify it passes.**

```bash
cd /Users/andrefogelman/orcabot && bun run test container/skills/pdf-pipeline/tests/interpretation.test.ts
```

Expected: All tests pass.

- [ ] **Step 9.5 — Run full PDF pipeline tests.**

```bash
cd /Users/andrefogelman/orcabot && bun run test container/skills/pdf-pipeline/tests/
```

Expected: All tests pass.

- [ ] **Step 9.6 — Commit.**

```bash
git add container/skills/pdf-pipeline/src/interpretation.ts container/skills/pdf-pipeline/tests/interpretation.test.ts
git commit -m "feat(pdf): add Gemini vision support via LLM_PROVIDER env var (Fix 9)"
```

---

## Sub-Project C: Quality

### Task 10: Quality report (Fix 11)

**Files:**
- Modify: `/Users/andrefogelman/orcabot/container/skills/dwg-pipeline/src/structured-output.ts`
- Create: `/Users/andrefogelman/orcabot/container/skills/dwg-pipeline/tests/quality-report.test.ts`

**Steps:**

- [ ] **Step 10.1 — Write test.** Create `/Users/andrefogelman/orcabot/container/skills/dwg-pipeline/tests/quality-report.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeQualityReport, type QualityReport } from "../src/structured-output.js";
import type { Ambiente } from "../src/types.js";
import type { AreaValidation } from "../../shared/area-validator.js";

describe("computeQualityReport", () => {
  const makeAmbiente = (nome: string, area: number, confidence: number): Ambiente => ({
    nome,
    area_m2: area,
    perimetro_m: Math.sqrt(area) * 4,
    pe_direito_m: 2.8,
    acabamentos: { piso: "x", parede: "x", forro: "x" },
    aberturas: [],
    confidence,
  });

  it("computes quality report for valid ambientes", () => {
    const ambientes = [
      makeAmbiente("Sala", 23, 0.97),
      makeAmbiente("Cozinha", 12, 0.95),
      makeAmbiente("Quarto", 15, 0.97),
    ];
    const validations: AreaValidation[] = [
      { valid: true, flags: [], adjusted_confidence: 0.97 },
      { valid: true, flags: [], adjusted_confidence: 0.95 },
      { valid: true, flags: [], adjusted_confidence: 0.97 },
    ];

    const report = computeQualityReport(ambientes, validations, "polyline");
    expect(report.total_ambientes).toBe(3);
    expect(report.valid_ambientes).toBe(3);
    expect(report.flagged_ambientes).toBe(0);
    expect(report.rejected_ambientes).toBe(0);
    expect(report.quality_score).toBeGreaterThan(0.9);
    expect(report.area_source).toBe("polyline");
  });

  it("counts flagged and rejected ambientes", () => {
    const ambientes = [
      makeAmbiente("Sala", 23, 0.97),
      makeAmbiente("Banheiro", 0.3, 0.40),
      makeAmbiente("Deposito", 800, 0.20),
    ];
    const validations: AreaValidation[] = [
      { valid: true, flags: [], adjusted_confidence: 0.97 },
      { valid: true, flags: ["area_muito_pequena"], adjusted_confidence: 0.40 },
      { valid: false, flags: ["area_muito_grande_ambiente_unico"], adjusted_confidence: 0.20 },
    ];

    const report = computeQualityReport(ambientes, validations, "hatch");
    expect(report.total_ambientes).toBe(3);
    expect(report.valid_ambientes).toBe(1);
    expect(report.flagged_ambientes).toBe(1);
    expect(report.rejected_ambientes).toBe(1);
    expect(report.flags_summary).toEqual({
      area_muito_pequena: 1,
      area_muito_grande_ambiente_unico: 1,
    });
    expect(report.quality_score).toBeLessThan(0.5);
    expect(report.area_source).toBe("hatch");
  });

  it("returns 0 quality score for empty ambientes", () => {
    const report = computeQualityReport([], [], "polyline");
    expect(report.total_ambientes).toBe(0);
    expect(report.quality_score).toBe(0);
  });
});
```

- [ ] **Step 10.2 — Run test, verify it fails.**

```bash
cd /Users/andrefogelman/orcabot && bun run test container/skills/dwg-pipeline/tests/quality-report.test.ts
```

Expected: Fails because `computeQualityReport` and `QualityReport` are not exported from `structured-output.ts`.

- [ ] **Step 10.3 — Implement.** Add to `/Users/andrefogelman/orcabot/container/skills/dwg-pipeline/src/structured-output.ts`:

Add the import for `AreaValidation` type (if not already imported from Task 5):

```typescript
import { validateArea, type AreaValidation } from "../../shared/area-validator.js";
```

Add the `QualityReport` interface and `computeQualityReport` function (export both):

```typescript
export interface QualityReport {
  total_ambientes: number;
  valid_ambientes: number;
  flagged_ambientes: number;
  rejected_ambientes: number;
  flags_summary: Record<string, number>;
  quality_score: number; // 0.0-1.0
  area_source: "hatch" | "polyline" | "llm_text" | "mixed";
}

/**
 * Compute a quality report from ambientes and their validation results.
 */
export function computeQualityReport(
  ambientes: Ambiente[],
  validations: AreaValidation[],
  areaSource: QualityReport["area_source"],
): QualityReport {
  if (ambientes.length === 0) {
    return {
      total_ambientes: 0,
      valid_ambientes: 0,
      flagged_ambientes: 0,
      rejected_ambientes: 0,
      flags_summary: {},
      quality_score: 0,
      area_source: areaSource,
    };
  }

  let valid = 0;
  let flagged = 0;
  let rejected = 0;
  const flagsSummary: Record<string, number> = {};

  for (const v of validations) {
    if (!v.valid) {
      rejected++;
    } else if (v.flags.length > 0) {
      flagged++;
    } else {
      valid++;
    }

    for (const flag of v.flags) {
      flagsSummary[flag] = (flagsSummary[flag] ?? 0) + 1;
    }
  }

  // Quality score: weighted by confidence of valid ambientes
  const totalConfidence = validations.reduce(
    (acc, v) => acc + v.adjusted_confidence,
    0,
  );
  const qualityScore = totalConfidence / ambientes.length;

  return {
    total_ambientes: ambientes.length,
    valid_ambientes: valid,
    flagged_ambientes: flagged,
    rejected_ambientes: rejected,
    flags_summary: flagsSummary,
    quality_score: Math.round(qualityScore * 100) / 100,
    area_source: areaSource,
  };
}
```

- [ ] **Step 10.4 — Run test, verify it passes.**

```bash
cd /Users/andrefogelman/orcabot && bun run test container/skills/dwg-pipeline/tests/quality-report.test.ts
```

Expected: All 3 tests pass.

- [ ] **Step 10.5 — Run full test suite.**

```bash
cd /Users/andrefogelman/orcabot && bun run test container/skills/
```

Expected: All tests pass across both pipelines and shared module.

- [ ] **Step 10.6 — Commit.**

```bash
git add container/skills/dwg-pipeline/src/structured-output.ts container/skills/dwg-pipeline/tests/quality-report.test.ts
git commit -m "feat(dwg): add quality report computation for extraction results (Fix 11)"
```

---

## Final Verification

- [ ] **Run typecheck.**

```bash
cd /Users/andrefogelman/orcabot && bun run typecheck
```

- [ ] **Run full test suite.**

```bash
cd /Users/andrefogelman/orcabot && bun run test
```

- [ ] **Run Python tests.**

```bash
cd /Users/andrefogelman/orcabot && python3 -m pytest container/skills/dwg-pipeline/python/tests/ -v
```

---

## Summary of Changes

| Task | Fix | File | Action |
|------|-----|------|--------|
| 1 | 1 | `container/skills/dwg-pipeline/src/types.ts` | Add `DxfHatchSchema`, `MIN_ROOM_AREA_MM2`, update `ExtractedDxfDataSchema` |
| 2 | 2 | `container/skills/dwg-pipeline/python/dwg_extractor.py` | Add `_infer_units_from_bbox`, update `detect_units` signature |
| 3 | 3 | `container/skills/dwg-pipeline/src/layer-classifier.ts` | Use `MIN_ROOM_AREA_MM2` constant |
| 3 | 3 | `container/skills/dwg-pipeline/src/structured-output.ts` | Use `MIN_ROOM_AREA_MM2` constant |
| 4 | 4+10 | `container/skills/shared/area-validator.ts` | Create shared area validator |
| 5 | 5 | `container/skills/dwg-pipeline/src/structured-output.ts` | Integrate hatches, add validation, add point-in-polygon |
| 6 | 6 | `container/skills/pdf-pipeline/src/prompts.ts` | Rewrite `INTERPRETATION_SYSTEM_PROMPT` |
| 7 | 7 | `container/skills/pdf-pipeline/src/interpretation.ts` | Add `detectCotas`, update `buildInterpretationPrompt` |
| 8 | 8 | `container/skills/pdf-pipeline/src/confidence.ts` | Change average to minimum |
| 9 | 9 | `container/skills/pdf-pipeline/src/interpretation.ts` | Add Gemini API support |
| 10 | 11 | `container/skills/dwg-pipeline/src/structured-output.ts` | Add `computeQualityReport` |
