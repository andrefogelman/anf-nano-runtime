import { describe, it, expect, vi } from "vitest";

describe("runPipeline", () => {
  it("skips jobs that are not pending", async () => {
    // Mock supabase to return a non-pending job
    vi.doMock("../src/supabase.js", () => ({
      getJob: vi.fn().mockResolvedValue({
        id: "test-id",
        file_id: "file-id",
        status: "done",
        stage: "done",
        progress: 100,
        error_message: null,
        started_at: null,
        completed_at: null,
      }),
      updateJob: vi.fn(),
      downloadFile: vi.fn(),
      getFileInfo: vi.fn(),
      upsertPageResult: vi.fn(),
      getOrgIdForProject: vi.fn(),
    }));

    const { runPipeline } = await import("../src/index.js");
    // Should not throw — just skip
    await runPipeline("test-id");
  });
});
