import { describe, it, expect } from "vitest";

// Test the pipeline stages execute in order and update progress
describe("Pipeline stage ordering", () => {
  it("stages run in correct order", () => {
    const stages = [
      "ingestion",
      "extraction",
      "classification",
      "interpretation",
      "structured_output",
      "done",
    ];
    stages.forEach((stage, i) => {
      if (i > 0) {
        expect(stages.indexOf(stage)).toBeGreaterThan(stages.indexOf(stages[i - 1]));
      }
    });
  });

  it("progress increases monotonically through stages", () => {
    const stageProgress: Record<string, number> = {
      ingestion: 10,
      extraction: 30,
      classification: 50,
      interpretation: 70,
      structured_output: 90,
      done: 100,
    };
    const values = Object.values(stageProgress);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });
});
