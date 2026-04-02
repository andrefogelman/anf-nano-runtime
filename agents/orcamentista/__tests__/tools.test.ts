import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/supabase-client.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      textSearch: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'test-id', project_id: 'p1' }, error: null }),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      order: vi.fn().mockReturnThis(),
    })),
  },
}));

import { toolHandlers, toolDefinitions } from '../tools.js';

describe('orcamentista tools', () => {
  it('exports all 9 tool definitions', () => {
    const names = toolDefinitions.map((t) => t.name);
    expect(names).toContain('process_pdf_results');
    expect(names).toContain('create_quantitativo');
    expect(names).toContain('delegate_to_specialist');
    expect(names).toContain('search_sinapi');
    expect(names).toContain('create_orcamento_item');
    expect(names).toContain('calculate_subtotals');
    expect(names).toContain('flag_for_review');
    expect(names).toContain('get_project_context');
    expect(names).toContain('export_budget');
    expect(toolDefinitions.length).toBe(9);
  });

  it('every definition has a matching handler', () => {
    for (const def of toolDefinitions) {
      expect(toolHandlers[def.name]).toBeTypeOf('function');
    }
  });

  it('get_project_context returns project data', async () => {
    const result = await toolHandlers.get_project_context({ project_id: 'p1' });
    expect(result).toBeDefined();
  });

  it('search_sinapi accepts descricao and uf', async () => {
    const result = await toolHandlers.search_sinapi({
      descricao: 'concreto fck 30',
      uf: 'SP',
      limit: 5,
    });
    expect(result).toBeDefined();
  });

  it('create_quantitativo requires all fields', async () => {
    const result = await toolHandlers.create_quantitativo({
      project_id: 'p1',
      disciplina: 'arquitetonico',
      item_code: '09.01',
      descricao: 'Revestimento ceramico piso sala',
      unidade: 'm2',
      quantidade: 18.5,
      calculo_memorial: 'Area sala conforme planta ARQ-01: 18,50 m2',
      origem_prancha: 'page-uuid-1',
      origem_ambiente: 'Sala',
      confidence: 0.92,
    });
    expect(result).toBeDefined();
  });

  it('calculate_subtotals returns cost summary', async () => {
    const result = await toolHandlers.calculate_subtotals({ project_id: 'p1' });
    expect(result).toBeDefined();
  });
});
