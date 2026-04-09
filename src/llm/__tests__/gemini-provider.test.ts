import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the @google/genai SDK
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(function (this: any) {
    this.models = { generateContent: mockGenerateContent };
  }),
}));

import { GeminiProvider } from '../gemini-provider.js';

describe('GeminiProvider', () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    vi.stubEnv('GOOGLE_API_KEY', 'test-key');
    provider = new GeminiProvider();
    vi.clearAllMocks();
  });

  describe('chat', () => {
    it('returns text and token counts', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'Hello world',
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
      });

      const result = await provider.chat({
        model: 'gemini-3.1-pro-preview',
        system: 'You are helpful',
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 1024,
        temperature: 0.2,
      });

      expect(result.text).toBe('Hello world');
      expect(result.inputTokens).toBe(10);
      expect(result.outputTokens).toBe(5);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-3.1-pro-preview',
          config: expect.objectContaining({
            maxOutputTokens: 1024,
            temperature: 0.2,
            systemInstruction: 'You are helpful',
          }),
          contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
        }),
      );
    });
  });

  describe('chatWithTools', () => {
    it('returns tool_use when model calls a function', async () => {
      mockGenerateContent.mockResolvedValue({
        text: '',
        functionCalls: [{ name: 'get_weather', args: { city: 'SP' } }],
        usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 15 },
      });

      const result = await provider.chatWithTools({
        model: 'gemini-3.1-pro-preview',
        system: 'You are helpful',
        messages: [{ role: 'user', content: 'Weather in SP?' }],
        tools: [
          {
            name: 'get_weather',
            description: 'Get weather',
            parameters: {
              type: 'object',
              properties: { city: { type: 'string' } },
              required: ['city'],
            },
          },
        ],
      });

      expect(result.stopReason).toBe('tool_use');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].name).toBe('get_weather');
      expect(result.toolCalls[0].input).toEqual({ city: 'SP' });
    });

    it('returns end when model responds with text only', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'The weather is sunny',
        functionCalls: undefined,
        usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 10 },
      });

      const result = await provider.chatWithTools({
        model: 'gemini-3.1-pro-preview',
        system: 'You are helpful',
        messages: [{ role: 'user', content: 'Thanks' }],
        tools: [],
      });

      expect(result.stopReason).toBe('end');
      expect(result.text).toBe('The weather is sunny');
      expect(result.toolCalls).toHaveLength(0);
    });
  });
});
