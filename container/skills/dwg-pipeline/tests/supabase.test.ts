import { describe, it, expect, vi, beforeEach } from "vitest";
import { setSupabase, getBlockMappings, saveBlockMapping, getLayerMappings, saveLayerMapping, getJob, updateJob, getFileInfo } from "../src/supabase.js";

// Mock Supabase client
function createMockSupabase(responses: Record<string, unknown> = {}) {
  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: responses.single ?? null,
          error: responses.singleError ?? null,
        }),
        then: (resolve: Function) =>
          resolve({
            data: responses.list ?? [],
            error: responses.listError ?? null,
          }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: responses.updateError ?? null,
      }),
    }),
    upsert: vi.fn().mockResolvedValue({
      error: responses.upsertError ?? null,
    }),
  });

  return { from: mockFrom } as any;
}

describe("getJob", () => {
  it("fetches a job by ID", async () => {
    const mockJob = {
      id: "test-job-id",
      file_id: "test-file-id",
      status: "pending",
      stage: null,
      progress: 0,
      error_message: null,
      started_at: null,
      completed_at: null,
    };

    const mockSb = createMockSupabase({ single: mockJob });
    setSupabase(mockSb);

    const job = await getJob("test-job-id");
    expect(job.id).toBe("test-job-id");
    expect(job.status).toBe("pending");
    expect(mockSb.from).toHaveBeenCalledWith("ob_pdf_jobs");
  });
});

describe("getFileInfo", () => {
  it("returns storage_path and file_type", async () => {
    const mockFile = {
      storage_path: "projects/abc/test.dwg",
      file_type: "dwg",
      project_id: "proj-123",
    };

    const mockSb = createMockSupabase({ single: mockFile });
    setSupabase(mockSb);

    const info = await getFileInfo("test-file-id");
    expect(info.file_type).toBe("dwg");
    expect(info.storage_path).toBe("projects/abc/test.dwg");
    expect(mockSb.from).toHaveBeenCalledWith("ob_project_files");
  });
});

describe("block mappings", () => {
  it("saveBlockMapping calls upsert on ob_block_mappings", async () => {
    const mockSb = createMockSupabase({});
    setSupabase(mockSb);

    await saveBlockMapping("org-1", {
      block_name: "TOMADA_2P",
      componente: "tomada",
      disciplina: "ele",
      unidade: "pt",
      confirmed: true,
    });

    expect(mockSb.from).toHaveBeenCalledWith("ob_block_mappings");
  });
});

describe("layer mappings", () => {
  it("saveLayerMapping calls upsert on ob_layer_mappings", async () => {
    const mockSb = createMockSupabase({});
    setSupabase(mockSb);

    await saveLayerMapping("org-1", {
      layer_name: "ARQ-PAREDE",
      disciplina: "arq",
      confirmed: true,
    });

    expect(mockSb.from).toHaveBeenCalledWith("ob_layer_mappings");
  });
});
