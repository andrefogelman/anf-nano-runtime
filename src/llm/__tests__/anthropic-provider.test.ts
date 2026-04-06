import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(function () {
    return { messages: { create: mockCreate } };
  }),
}));

import { AnthropicProvider } from '../anthropic-provider.js';

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    provider = new AnthropicProvider();
    vi.clearAllMocks();
  });

  describe('chat', () => {
    it('returns text and token counts', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Hello' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const result = await provider.chat({
        model: 'claude-sonnet-4-6',
        system: 'You are helpful',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.text).toBe('Hello');
      expect(result.inputTokens).toBe(10);
      expect(result.outputTokens).toBe(5);
    });
  });

  describe('chatWithTools', () => {
    it('returns tool_use when model calls a tool', async () => {
      mockCreate.mockResolvedValue({
        content: [
          { type: 'tool_use', id: 'tu_1', name: 'get_weather', input: { city: 'SP' } },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 20, output_tokens: 15 },
      });

      const result = await provider.chatWithTools({
        model: 'claude-sonnet-4-6',
        system: 'You are helpful',
        messages: [{ role: 'user', content: 'Weather?' }],
        tools: [
          {
            name: 'get_weather',
            description: 'Get weather',
            parameters: { type: 'object', properties: { city: { type: 'string' } } },
          },
        ],
      });

      expect(result.stopReason).toBe('tool_use');
      expect(result.toolCalls[0]).toEqual({ id: 'tu_1', name: 'get_weather', input: { city: 'SP' } });
    });

    it('returns end when model responds with text', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Sunny' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 20, output_tokens: 10 },
      });

      const result = await provider.chatWithTools({
        model: 'claude-sonnet-4-6',
        system: 'You are helpful',
        messages: [{ role: 'user', content: 'Thanks' }],
        tools: [],
      });

      expect(result.stopReason).toBe('end');
      expect(result.text).toBe('Sunny');
    });
  });
});
