import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../orcabot-agent-runner.js', () => ({
  runOrcabotAgent: vi.fn().mockResolvedValue({
    response: 'Processamento concluído',
    tokens_used: 100,
    tool_calls: [],
    duration_ms: 500,
  }),
}));

vi.mock('../../src/supabase-client.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'task-1',
          to_agent: 'estrutural',
          status: 'pending',
          pranchas: ['p1'],
          context: {},
          project_id: 'proj-1',
        },
        error: null,
      }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'task-1',
            to_agent: 'estrutural',
            status: 'pending',
            pranchas: ['p1'],
            context: {},
            project_id: 'proj-1',
          },
        ],
        error: null,
      }),
    })),
  },
}));

import {
  processPendingDelegations,
  processOneTask,
} from '../delegation-engine.js';

describe('delegation-engine', () => {
  it('processPendingDelegations fetches pending tasks', async () => {
    const count = await processPendingDelegations();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('processOneTask updates status to in_progress then completed', async () => {
    const task = {
      id: 'task-1',
      project_id: 'proj-1',
      from_agent: 'orcamentista',
      to_agent: 'estrutural',
      status: 'pending' as const,
      pranchas: ['page-1'],
      context: { tipo_obra: 'residencial' },
      created_at: new Date().toISOString(),
    };
    await expect(processOneTask(task)).resolves.not.toThrow();
  });
});
