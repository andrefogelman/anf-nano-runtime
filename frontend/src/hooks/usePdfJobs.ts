import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ProjectFile, PdfJob, PdfPage } from "@/types/orcamento";

export function useProjectFiles(projectId: string) {
  return useQuery({
    queryKey: ["project-files", projectId],
    queryFn: async (): Promise<ProjectFile[]> => {
      const { data, error } = await supabase
        .from("ob_project_files")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function usePdfJobs(projectId: string) {
  return useQuery({
    queryKey: ["pdf-jobs", projectId],
    queryFn: async (): Promise<PdfJob[]> => {
      const { data, error } = await supabase
        .from("ob_pdf_jobs")
        .select("*, ob_project_files!inner(project_id)")
        .eq("ob_project_files.project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as PdfJob[];
    },
    enabled: !!projectId,
  });
}

export function usePdfPages(fileId: string) {
  return useQuery({
    queryKey: ["pdf-pages", fileId],
    queryFn: async (): Promise<PdfPage[]> => {
      const { data, error } = await supabase
        .from("ob_pdf_pages")
        .select("*")
        .eq("file_id", fileId)
        .order("page_number", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!fileId,
  });
}

export function useReviewItems(projectId: string) {
  return useQuery({
    queryKey: ["review-items", projectId],
    queryFn: async (): Promise<PdfPage[]> => {
      const { data, error } = await supabase
        .from("ob_pdf_pages")
        .select("*, ob_project_files!inner(project_id)")
        .eq("ob_project_files.project_id", projectId)
        .eq("needs_review", true)
        .order("confidence", { ascending: true });

      if (error) throw error;
      return data as unknown as PdfPage[];
    },
    enabled: !!projectId,
  });
}

export function useUploadPdf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      file,
      disciplina,
    }: {
      projectId: string;
      file: File;
      disciplina: string | null;
    }) => {
      const storagePath = `projects/${projectId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("project-pdfs")
        .upload(storagePath, file, {
          contentType: "application/pdf",
        });

      if (uploadError) throw uploadError;

      const { data: fileRecord, error: fileError } = await supabase
        .from("ob_project_files")
        .insert({
          project_id: projectId,
          storage_path: storagePath,
          filename: file.name,
          file_type: "pdf" as const,
          disciplina: disciplina as ProjectFile["disciplina"],
          status: "uploaded" as const,
        })
        .select()
        .single();

      if (fileError) throw fileError;

      const { error: jobError } = await supabase
        .from("ob_pdf_jobs")
        .insert({
          file_id: fileRecord.id,
          status: "pending" as const,
          stage: null,
          progress: 0,
          error_message: null,
          started_at: null,
          completed_at: null,
        });

      if (jobError) throw jobError;

      return fileRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project-files", data.project_id] });
      queryClient.invalidateQueries({ queryKey: ["pdf-jobs", data.project_id] });
    },
  });
}

export function useProcessingRuns(fileId: string) {
  return useQuery({
    queryKey: ["processing-runs", fileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ob_processing_runs")
        .select("*")
        .eq("file_id", fileId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Array<{
        id: string;
        prompt: string;
        summary: string | null;
        items: Array<{
          descricao: string;
          quantidade: number;
          unidade: string;
          memorial_calculo?: string;
          ambiente?: string;
          disciplina?: string;
          confidence?: number;
        }>;
        needs_review: Array<{ item: string; motivo: string }>;
        pages_processed: number;
        status: string;
        error_message: string | null;
        created_at: string;
      }>;
    },
    enabled: !!fileId,
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId, storagePath, projectId }: { fileId: string; storagePath: string; projectId: string }) => {
      // Delete related pdf_pages and pdf_jobs first (cascade should handle, but be explicit)
      await supabase.from("ob_pdf_pages").delete().eq("file_id", fileId);
      await supabase.from("ob_pdf_jobs").delete().eq("file_id", fileId);

      // Delete the file record
      const { error: fileError } = await supabase
        .from("ob_project_files")
        .delete()
        .eq("id", fileId);
      if (fileError) throw fileError;

      // Delete from storage
      await supabase.storage.from("project-pdfs").remove([storagePath]);

      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project-files", data.projectId] });
      queryClient.invalidateQueries({ queryKey: ["pdf-jobs", data.projectId] });
      queryClient.invalidateQueries({ queryKey: ["review-items", data.projectId] });
    },
  });
}

export function useResolveReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pageId,
      reviewNotes,
      updatedData,
    }: {
      pageId: string;
      reviewNotes: string;
      updatedData?: Record<string, unknown>;
    }) => {
      const updates: Record<string, unknown> = {
        needs_review: false,
        review_notes: reviewNotes,
      };
      if (updatedData) {
        updates.structured_data = updatedData;
      }

      const { data, error } = await supabase
        .from("ob_pdf_pages")
        .update(updates)
        .eq("id", pageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-items"] });
      queryClient.invalidateQueries({ queryKey: ["pdf-pages"] });
    },
  });
}
