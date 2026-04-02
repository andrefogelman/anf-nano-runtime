// container/skills/dwg-pipeline/src/extractor.ts
import { execFile } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ExtractedDxfDataSchema, type ExtractedDxfData } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PYTHON_SCRIPT = join(__dirname, "..", "python", "dwg_extractor.py");

/**
 * Extract structured data from a DXF file using the Python ezdxf extractor.
 *
 * Spawns a Python subprocess that parses the DXF and outputs JSON to stdout.
 * The JSON is validated against the ExtractedDxfData schema.
 *
 * @param dxfPath - Absolute path to the DXF file
 * @returns Parsed and validated ExtractedDxfData
 */
export async function extractDxf(dxfPath: string): Promise<ExtractedDxfData> {
  const stdout = await runPython(dxfPath);

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error(`DXF extractor returned invalid JSON: ${stdout.slice(0, 200)}`);
  }

  const result = ExtractedDxfDataSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`DXF extractor output failed validation: ${issues}`);
  }

  return result.data;
}

/**
 * Run the Python extractor script and return its stdout.
 */
function runPython(dxfPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "python3",
      [PYTHON_SCRIPT, dxfPath],
      {
        timeout: 120_000,
        maxBuffer: 50 * 1024 * 1024, // 50MB — large DXFs can have many entities
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `DXF extractor failed: ${stderr || error.message}`
            )
          );
          return;
        }
        resolve(stdout);
      }
    );
  });
}

/**
 * Run geometry.py helper functions via a Python subprocess.
 * Used for point-in-polygon text association.
 */
export async function associateTextsToRooms(
  texts: Array<{ position: [number, number]; content: string }>,
  roomPolylines: Array<{ vertices: [number, number][]; is_closed: boolean }>
): Promise<Record<number, number>> {
  const GEOMETRY_SCRIPT = join(__dirname, "..", "python", "geometry_bridge.py");
  const input = JSON.stringify({ texts, room_polylines: roomPolylines });

  return new Promise((resolve, reject) => {
    const proc = execFile(
      "python3",
      [GEOMETRY_SCRIPT],
      { timeout: 30_000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`geometry bridge failed: ${stderr || error.message}`));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch {
          reject(new Error(`geometry bridge invalid JSON: ${stdout.slice(0, 200)}`));
        }
      }
    );
    proc.stdin?.write(input);
    proc.stdin?.end();
  });
}
