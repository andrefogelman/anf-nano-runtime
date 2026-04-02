#!/usr/bin/env python3
"""Generate a minimal sample DXF for testing."""

import ezdxf

doc = ezdxf.new("R2010")
msp = doc.modelspace()

# Create layers
doc.layers.add("ARQ-PAREDE", color=7)
doc.layers.add("ARQ-TEXTO", color=7)
doc.layers.add("ELE-TOMADA", color=3)
doc.layers.add("HID-TUB-AF", color=1)
doc.layers.add("COT-COTAS", color=2)

# Room 1: Sala (5m x 3.7m in mm)
msp.add_lwpolyline(
    [(0, 0), (5000, 0), (5000, 3700), (0, 3700)],
    close=True,
    dxfattribs={"layer": "ARQ-PAREDE"},
)

# Room 2: Cozinha (3m x 3m)
msp.add_lwpolyline(
    [(5000, 0), (8000, 0), (8000, 3000), (5000, 3000)],
    close=True,
    dxfattribs={"layer": "ARQ-PAREDE"},
)

# Room names as TEXT
msp.add_text("Sala", dxfattribs={"layer": "ARQ-TEXTO", "height": 200, "insert": (2500, 1850)})
msp.add_text("Cozinha", dxfattribs={"layer": "ARQ-TEXTO", "height": 200, "insert": (6500, 1500)})

# Tomada block definition
block = doc.blocks.new("TOMADA_2P")
block.add_circle((0, 0), radius=50, dxfattribs={"layer": "ELE-TOMADA"})
block.add_line((-50, 0), (50, 0), dxfattribs={"layer": "ELE-TOMADA"})

# Insert tomadas
for x, y in [(500, 300), (2000, 300), (4000, 300), (500, 3400), (4500, 3400)]:
    msp.add_blockref("TOMADA_2P", (x, y), dxfattribs={"layer": "ELE-TOMADA"})

# Hydraulic line (cold water pipe)
msp.add_line((0, 1850), (5000, 1850), dxfattribs={"layer": "HID-TUB-AF"})
msp.add_line((5000, 1850), (8000, 1850), dxfattribs={"layer": "HID-TUB-AF"})

# Dimension
dim = msp.add_linear_dim(
    base=(2500, -500),
    p1=(0, 0),
    p2=(5000, 0),
    dxfattribs={"layer": "COT-COTAS"},
)
dim.render()

# Set units to mm
doc.header["$INSUNITS"] = 4  # mm

doc.saveas("sample.dxf")
print("sample.dxf created successfully")
