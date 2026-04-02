// container/skills/dwg-pipeline/src/converter.ts
import { execFile } from "node:child_process";
import { access, constants } from "node:fs/promises";
import { join, basename } from "node:path";
import type { ConversionResult } from "./types.js";

/**
 * Convert a DWG file to DXF using LibreDWG's dwg2dxf CLI tool.
 *
 * @param dwgPath - Absolute path to the input .dwg file
 * @param outputDir - Directory where the .dxf file will be written
 * @returns ConversionResult with success status and output path or error
 */
export async function convertDwgToDxf(
  dwgPath: string,
  outputDir: string
): Promise<ConversionResult> {
  // Verify input file exists
  try {
    await access(dwgPath, constants.R_OK);
  } catch {
    return { success: false, error: `Input file not found: ${dwgPath}` };
  }

  // Derive output filename: input.dwg → input.dxf
  const dxfFilename = basename(dwgPath).replace(/\.dwg$/i, ".dxf");
  const dxfPath = join(outputDir, dxfFilename);

  return new Promise<ConversionResult>((resolve) => {
    execFile(
      "dwg2dxf",
      ["-o", dxfPath, dwgPath],
      { timeout: 60_000 },
      async (error, _stdout, stderr) => {
        if (error) {
          // Check if dwg2dxf is not installed
          if ("code" in error && error.code === "ENOENT") {
            resolve({
              success: false,
              error: "dwg2dxf not installed. Install libredwg-tools: apt-get install libredwg-tools",
            });
            return;
          }

          // Conversion failed (unsupported DWG version, corrupt file, etc.)
          resolve({
            success: false,
            error: `dwg2dxf failed: ${stderr || error.message}`,
          });
          return;
        }

        // Verify output file was created
        try {
          await access(dxfPath, constants.R_OK);
          resolve({ success: true, dxfPath });
        } catch {
          resolve({
            success: false,
            error: `dwg2dxf ran but output file not created at ${dxfPath}`,
          });
        }
      }
    );
  });
}

/**
 * Check if a file is already a DXF (based on extension).
 */
export function isDxfFile(filePath: string): boolean {
  return filePath.toLowerCase().endsWith(".dxf");
}

/**
 * Check if a file is a DWG (based on extension).
 */
export function isDwgFile(filePath: string): boolean {
  return filePath.toLowerCase().endsWith(".dwg");
}
