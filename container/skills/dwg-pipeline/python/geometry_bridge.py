#!/usr/bin/env python3
"""
Bridge script that reads JSON from stdin and runs geometry functions.

Input JSON format:
{
  "texts": [{"position": [x, y], "content": "Sala"}],
  "room_polylines": [{"vertices": [[x1,y1], [x2,y2], ...], "is_closed": true}]
}

Output JSON: { "0": 1, "2": 0 }  (text_index -> room_index)
"""

import json
import sys

from geometry import associate_texts_to_rooms


def main() -> None:
    raw = sys.stdin.read()
    data = json.loads(raw)
    result = associate_texts_to_rooms(data["texts"], data["room_polylines"])
    # Convert int keys to string keys for JSON
    json.dump({str(k): v for k, v in result.items()}, sys.stdout)


if __name__ == "__main__":
    main()
