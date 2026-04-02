// container/skills/excel-export/index.ts
// Generates XLSX budget reports from OrcaBot data.

import ExcelJS from 'exceljs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient;

function getSb(): SupabaseClient {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  supabase = createClient(url, key);
  return supabase;
}

/** Allow injecting an existing Supabase client */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setSupabase(sb: any): void {
  supabase = sb as SupabaseClient;
}

interface Project {
  id: string;
  name: string;
  tipo_obra: string;
  area_total_m2: number;
  uf: string;
  cidade: string;
  bdi_percentual: number;
}

interface OrcamentoItem {
  eap_code: string;
  eap_level: number;
  descricao: string;
  unidade: string;
  quantidade: number;
  fonte: string;
  fonte_codigo: string;
  custo_unitario: number;
  custo_material: number;
  custo_mao_obra: number;
  custo_total: number;
  peso_percentual: number;
  curva_abc_classe: string | null;
}

interface Quantitativo {
  disciplina: string;
  item_code: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  calculo_memorial: string;
  origem_prancha: string;
  confidence: number;
  needs_review: boolean;
}

/**
 * Generate a complete XLSX budget report for a project.
 * Returns the Buffer with the .xlsx content.
 */
export async function generateBudgetXlsx(projectId: string): Promise<Buffer> {
  const sb = getSb();

  // Fetch project
  const { data: project, error: projErr } = await sb
    .from('ob_projects')
    .select('*')
    .eq('id', projectId)
    .single();
  if (projErr || !project) throw new Error(`Project ${projectId} not found`);
  const proj = project as Project;

  // Fetch orcamento items
  const { data: items } = await sb
    .from('ob_orcamento_items')
    .select('*')
    .eq('project_id', projectId)
    .order('eap_code', { ascending: true });
  const orcItems = (items || []) as OrcamentoItem[];

  // Fetch quantitativos
  const { data: quants } = await sb
    .from('ob_quantitativos')
    .select('*')
    .eq('project_id', projectId)
    .order('item_code', { ascending: true });
  const quantItems = (quants || []) as Quantitativo[];

  const wb = new ExcelJS.Workbook();
  wb.creator = 'OrcaBot';
  wb.created = new Date();

  // --- Sheet 1: Capa ---
  const sheetCapa = wb.addWorksheet('Capa');
  sheetCapa.columns = [
    { header: '', key: 'label', width: 30 },
    { header: '', key: 'value', width: 50 },
  ];
  const capaData = [
    ['ORÇAMENTO DE OBRA', ''],
    ['', ''],
    ['Projeto', proj.name],
    ['Tipo de Obra', proj.tipo_obra || '-'],
    ['Área Total (m²)', proj.area_total_m2?.toString() || '-'],
    ['UF', proj.uf || '-'],
    ['Cidade', proj.cidade || '-'],
    ['BDI (%)', proj.bdi_percentual?.toString() || '0'],
    ['', ''],
    ['Gerado por', 'OrcaBot - IA para Orçamentação'],
    ['Data', new Date().toLocaleDateString('pt-BR')],
  ];
  for (const [label, value] of capaData) {
    sheetCapa.addRow({ label, value });
  }
  // Style title
  const titleRow = sheetCapa.getRow(1);
  titleRow.font = { bold: true, size: 16 };
  titleRow.height = 30;

  // --- Sheet 2: Planilha Orçamentária ---
  const sheetOrc = wb.addWorksheet('Planilha Orçamentária');
  sheetOrc.columns = [
    { header: 'EAP', key: 'eap', width: 12 },
    { header: 'Descrição', key: 'descricao', width: 50 },
    { header: 'Und', key: 'unidade', width: 8 },
    { header: 'Qtd', key: 'quantidade', width: 12 },
    { header: 'Fonte', key: 'fonte', width: 10 },
    { header: 'Código', key: 'codigo', width: 14 },
    { header: 'C.Unit (R$)', key: 'custo_unitario', width: 14 },
    { header: 'Material (R$)', key: 'custo_material', width: 14 },
    { header: 'M.Obra (R$)', key: 'custo_mao_obra', width: 14 },
    { header: 'Total (R$)', key: 'custo_total', width: 16 },
    { header: 'Peso %', key: 'peso', width: 10 },
    { header: 'ABC', key: 'abc', width: 6 },
  ];

  // Header style
  const headerRow = sheetOrc.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2E5090' },
  };
  headerRow.alignment = { horizontal: 'center' };

  for (const item of orcItems) {
    const row = sheetOrc.addRow({
      eap: item.eap_code,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: item.quantidade,
      fonte: item.fonte?.toUpperCase(),
      codigo: item.fonte_codigo,
      custo_unitario: item.custo_unitario,
      custo_material: item.custo_material,
      custo_mao_obra: item.custo_mao_obra,
      custo_total: item.custo_total,
      peso: item.peso_percentual,
      abc: item.curva_abc_classe,
    });

    // Bold for level 1-2 (macro-etapas)
    if (item.eap_level <= 2) {
      row.font = { bold: true };
      if (item.eap_level === 1) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8EDF5' },
        };
      }
    }

    // Number formatting
    for (const col of ['custo_unitario', 'custo_material', 'custo_mao_obra', 'custo_total']) {
      const cell = row.getCell(col);
      cell.numFmt = '#,##0.00';
    }
    row.getCell('peso').numFmt = '0.00%';
  }

  // Total row
  if (orcItems.length > 0) {
    const total = orcItems.reduce((sum, i) => sum + (i.custo_total || 0), 0);
    const totalRow = sheetOrc.addRow({
      eap: '',
      descricao: 'TOTAL GERAL',
      custo_total: total,
    });
    totalRow.font = { bold: true, size: 12 };
    totalRow.getCell('custo_total').numFmt = '#,##0.00';
  }

  // --- Sheet 3: Quantitativos ---
  const sheetQuant = wb.addWorksheet('Quantitativos');
  sheetQuant.columns = [
    { header: 'Disciplina', key: 'disciplina', width: 15 },
    { header: 'Código', key: 'item_code', width: 12 },
    { header: 'Descrição', key: 'descricao', width: 50 },
    { header: 'Und', key: 'unidade', width: 8 },
    { header: 'Qtd', key: 'quantidade', width: 12 },
    { header: 'Memorial', key: 'memorial', width: 40 },
    { header: 'Prancha', key: 'prancha', width: 15 },
    { header: 'Confiança', key: 'confidence', width: 12 },
    { header: 'Revisão?', key: 'review', width: 10 },
  ];

  const quantHeader = sheetQuant.getRow(1);
  quantHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  quantHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2E7D32' },
  };

  for (const q of quantItems) {
    const row = sheetQuant.addRow({
      disciplina: q.disciplina,
      item_code: q.item_code,
      descricao: q.descricao,
      unidade: q.unidade,
      quantidade: q.quantidade,
      memorial: q.calculo_memorial,
      prancha: q.origem_prancha,
      confidence: q.confidence,
      review: q.needs_review ? 'SIM' : '',
    });

    row.getCell('quantidade').numFmt = '#,##0.00';
    row.getCell('confidence').numFmt = '0%';

    // Highlight items needing review
    if (q.needs_review) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF3E0' },
      };
    }
  }

  // Auto-filter on all sheets with data
  if (orcItems.length > 0) {
    sheetOrc.autoFilter = {
      from: 'A1',
      to: `L${orcItems.length + 1}`,
    };
  }
  if (quantItems.length > 0) {
    sheetQuant.autoFilter = {
      from: 'A1',
      to: `I${quantItems.length + 1}`,
    };
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Generate and upload the budget XLSX to Supabase Storage.
 * Returns the storage path.
 */
export async function exportBudgetToStorage(projectId: string): Promise<string> {
  const sb = getSb();
  const buffer = await generateBudgetXlsx(projectId);

  const storagePath = `exports/${projectId}/orcamento-${Date.now()}.xlsx`;
  const { error } = await sb.storage
    .from('project-pdfs')
    .upload(storagePath, buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: true,
    });

  if (error) throw new Error(`Failed to upload XLSX: ${error.message}`);

  console.log(`[excel-export] Uploaded budget to ${storagePath}`);
  return storagePath;
}

// CLI entry point: `excel-export --project-id <uuid>`
const args = process.argv.slice(2);
if (args[0] === '--project-id' && args[1]) {
  exportBudgetToStorage(args[1])
    .then((path) => console.log(`Export complete: ${path}`))
    .catch((err) => {
      console.error('Export failed:', err);
      process.exit(1);
    });
}
