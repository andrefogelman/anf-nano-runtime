import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const ORCABOT_API = import.meta.env.VITE_ORCABOT_API_URL || "";

export interface BdiInput {
  lucro_pct: number;
  despesas_indiretas_pct: number;
  risco_pct: number;
  despesas_financeiras_pct: number;
  iss_pct: number;
  pis_pct: number;
  cofins_pct: number;
  irpj_pct: number;
  csll_pct: number;
}

export const DEFAULT_BDI: BdiInput = {
  lucro_pct: 8.0,
  despesas_indiretas_pct: 3.0,
  risco_pct: 1.0,
  despesas_financeiras_pct: 1.0,
  iss_pct: 5.0,
  pis_pct: 0.65,
  cofins_pct: 3.0,
  irpj_pct: 1.2,
  csll_pct: 1.08,
};

export interface BdiResult {
  lucro_pct: number;
  despesas_indiretas_pct: number;
  risco_pct: number;
  despesas_financeiras_pct: number;
  tributos: {
    iss: number;
    pis: number;
    cofins: number;
    irpj: number;
    csll: number;
    total: number;
  };
  componentes_fracao: { AC: number; DF: number; L: number; I: number };
  bdi_pct: number;
  multiplicador: number;
}

async function authHeader(extra?: HeadersInit): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada — faça login novamente");
  return {
    Authorization: `Bearer ${token}`,
    ...(extra || {}),
  };
}

export function useCalcBdi() {
  return useMutation<BdiResult, Error, BdiInput>({
    mutationFn: async (input) => {
      const headers = await authHeader({ "Content-Type": "application/json" });
      const res = await fetch(`${ORCABOT_API}/api/export/bdi/calc`, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail));
      }
      return (await res.json()) as BdiResult;
    },
  });
}

async function downloadBlob(input: {
  url: string;
  body: Record<string, unknown>;
  filename: string;
}) {
  const headers = await authHeader({ "Content-Type": "application/json" });
  const res = await fetch(input.url, {
    method: "POST",
    headers,
    body: JSON.stringify(input.body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail));
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = input.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
}

export function useExportXlsx() {
  return useMutation<
    void,
    Error,
    { project_id: string; bdi?: BdiInput; filename?: string }
  >({
    mutationFn: async ({ project_id, bdi, filename }) => {
      await downloadBlob({
        url: `${ORCABOT_API}/api/export/xlsx`,
        body: { project_id, bdi },
        filename: filename ?? `orcamento-${project_id.slice(0, 8)}.xlsx`,
      });
    },
  });
}

export function useExportMemorial() {
  return useMutation<
    void,
    Error,
    { project_id: string; filename?: string }
  >({
    mutationFn: async ({ project_id, filename }) => {
      await downloadBlob({
        url: `${ORCABOT_API}/api/export/memorial`,
        body: { project_id },
        filename: filename ?? `memorial-${project_id.slice(0, 8)}.pdf`,
      });
    },
  });
}

/** Chama a função SQL atualizar_curva_abc(project_id) via Supabase RPC. */
export function useAtualizarCurvaAbc() {
  const qc = useQueryClient();
  return useMutation<{ updated_count: number }, Error, { project_id: string }>({
    mutationFn: async ({ project_id }) => {
      const { data, error } = await supabase.rpc("atualizar_curva_abc", {
        p_project_id: project_id,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? { updated_count: 0 }) as { updated_count: number };
    },
    onSuccess: (_data, { project_id }) => {
      qc.invalidateQueries({ queryKey: ["orcamento-items", project_id] });
      qc.invalidateQueries({ queryKey: ["curva-abc", project_id] });
    },
  });
}
