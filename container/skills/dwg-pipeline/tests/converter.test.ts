import { describe, it, expect, vi, beforeEach } from "vitest";
import { isDxfFile, isDwgFile } from "../src/converter.js";

// Unit tests for helper functions (convertDwgToDxf requires mocking child_process
// which is tested via integration tests with actual dwg2dxf binary)

describe("isDxfFile", () => {
  it("returns true for .dxf extension", () => {
    expect(isDxfFile("/path/to/file.dxf")).toBe(true);
  });

  it("returns true for .DXF extension (case insensitive)", () => {
    expect(isDxfFile("/path/to/FILE.DXF")).toBe(true);
  });

  it("returns false for .dwg extension", () => {
    expect(isDxfFile("/path/to/file.dwg")).toBe(false);
  });

  it("returns false for .pdf extension", () => {
    expect(isDxfFile("/path/to/file.pdf")).toBe(false);
  });
});

describe("isDwgFile", () => {
  it("returns true for .dwg extension", () => {
    expect(isDwgFile("/path/to/file.dwg")).toBe(true);
  });

  it("returns true for .DWG extension (case insensitive)", () => {
    expect(isDwgFile("/path/to/FILE.DWG")).toBe(true);
  });

  it("returns false for .dxf extension", () => {
    expect(isDwgFile("/path/to/file.dxf")).toBe(false);
  });
});

describe("convertDwgToDxf", () => {
  it("returns error for non-existent input file", async () => {
    const { convertDwgToDxf } = await import("../src/converter.js");
    const result = await convertDwgToDxf("/nonexistent/file.dwg", "/tmp");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Input file not found");
  });
});
