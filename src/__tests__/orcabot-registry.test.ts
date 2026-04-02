import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/supabase-client.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { id: 'test-id' }, error: null }),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      order: vi.fn().mockReturnThis(),
    })),
  },
}));

import { getAgentTools, getAllAgentSlugs } from '../agent-registry.js';

describe('OrcaBot agent registry', () => {
  it('registers orcamentista agent', () => {
    const tools = getAgentTools('orcamentista');
    expect(tools).not.toBeNull();
    expect(tools!.definitions.length).toBe(9);
  });

  it('registers estrutural agent', () => {
    const tools = getAgentTools('estrutural');
    expect(tools).not.toBeNull();
    expect(tools!.definitions.length).toBe(4);
  });

  it('registers hidraulico agent', () => {
    const tools = getAgentTools('hidraulico');
    expect(tools).not.toBeNull();
    expect(tools!.definitions.length).toBe(3);
  });

  it('registers eletricista agent', () => {
    const tools = getAgentTools('eletricista');
    expect(tools).not.toBeNull();
    expect(tools!.definitions.length).toBe(4);
  });

  it('getAllAgentSlugs includes all 4 orcabot agents', () => {
    const slugs = getAllAgentSlugs();
    expect(slugs).toContain('orcamentista');
    expect(slugs).toContain('estrutural');
    expect(slugs).toContain('hidraulico');
    expect(slugs).toContain('eletricista');
  });
});
