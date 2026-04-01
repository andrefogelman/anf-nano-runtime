#!/usr/bin/env python3
"""
PaddleOCR worker — receives an image path, outputs JSON to stdout.

Usage: python3 ocr_worker.py <image_path>

Output format (JSON array):
[
  [[[x1,y1],[x2,y2],[x3,y3],[x4,y4]], ["detected text", 0.95]],
  ...
]

Optimized for construction drawings: uses angle classification for rotated text,
and the 'pt' (Portuguese) language model when available.
"""

import sys
import json

from paddleocr import PaddleOCR


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 ocr_worker.py <image_path>", file=sys.stderr)
        sys.exit(1)

    image_path = sys.argv[1]

    # Initialize PaddleOCR
    # - use_angle_cls=True: detect and correct rotated text (common in drawings)
    # - lang='pt': Portuguese model (fallback to 'en' if pt not available)
    # - show_log=False: suppress verbose logging
    # - use_gpu=False: CPU-only for container compatibility
    ocr = PaddleOCR(
        use_angle_cls=True,
        lang="pt",
        show_log=False,
        use_gpu=False,
    )

    result = ocr.ocr(image_path, cls=True)

    if result is None or len(result) == 0 or result[0] is None:
        print("[]")
        return

    # PaddleOCR returns a list of pages, each page is a list of [bbox, (text, conf)]
    # For a single image, result[0] is the page
    page_result = result[0]

    # Convert to serializable format
    output = []
    for item in page_result:
        bbox = item[0]  # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
        text = item[1][0]
        confidence = float(item[1][1])
        output.append([bbox, [text, confidence]])

    print(json.dumps(output, ensure_ascii=False))


if __name__ == "__main__":
    main()
