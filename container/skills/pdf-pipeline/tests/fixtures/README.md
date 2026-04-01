# Test Fixtures

This directory should contain test PDF files for integration testing.
They are NOT committed to git (gitignored) due to size.

## Required fixtures

| File | Description | How to create |
|------|-------------|---------------|
| `cad-export.pdf` | CAD-exported architectural floor plan with native text layers | Export any .dwg floor plan to PDF from AutoCAD/Revit |
| `scanned.pdf` | Scanned construction drawing (image-only, no text layer) | Scan any printed drawing or take a photo -> convert to PDF |
| `multi-page.pdf` | Multi-page PDF with mixed types (floor plan + section + legend) | Combine 3+ pages from different drawing types |

## Quick test fixture generation

For CI/development, generate synthetic test PDFs:

```bash
# Requires: npm install pdf-lib
npx tsx tests/fixtures/generate-test-pdf.ts
```
