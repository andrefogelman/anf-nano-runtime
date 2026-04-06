// src/llm/gemini-provider.ts
// Gemini implementation of LlmProvider using @google/genai SDK.

import { GoogleGenAI } from '@google/genai';
import type {
  LlmProvider,
  ChatOpts,
  ChatResult,
  ToolChatOpts,
  ToolChatResult,
  Message,
  ToolDef,
} from './types.js';

export class GeminiProvider implements LlmProvider {
  private client: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_API_KEY is required for GeminiProvider');
    this.client = new GoogleGenAI({ apiKey });
  }

  async chat(opts: ChatOpts): Promise<ChatResult> {
    const response = await this.client.models.generateContent({
      model: opts.model,
      contents: this.buildContents(opts.messages),
      config: {
        maxOutputTokens: opts.maxTokens ?? 4096,
        temperature: opts.temperature ?? 0.2,
        systemInstruction: opts.system,
      },
    });

    return {
      text: response.text ?? '',
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }

  async chatWithTools(opts: ToolChatOpts): Promise<ToolChatResult> {
    const tools = opts.tools.length > 0
      ? [{ functionDeclarations: opts.tools.map((t) => this.toFunctionDeclaration(t)) }]
      : undefined;

    const response = await this.client.models.generateContent({
      model: opts.model,
      contents: this.buildContents(opts.messages),
      config: {
        maxOutputTokens: opts.maxTokens ?? 4096,
        temperature: opts.temperature ?? 0.2,
        systemInstruction: opts.system,
        tools,
      },
    });

    const functionCalls = response.functionCalls ?? [];

    if (functionCalls.length > 0) {
      return {
        text: response.text ?? '',
        inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        stopReason: 'tool_use',
        toolCalls: functionCalls.map((fc: { name?: string; args?: unknown }, i: number) => ({
          id: `call_${Date.now()}_${i}`,
          name: fc.name ?? '',
          input: fc.args ?? {},
        })),
      };
    }

    return {
      text: response.text ?? '',
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      stopReason: 'end',
      toolCalls: [],
    };
  }

  private buildContents(messages: Message[]): Array<{
    role: string;
    parts: Array<{
      text?: string;
      functionCall?: { name: string; args: unknown };
      functionResponse?: { name: string; response: unknown };
    }>;
  }> {
    return messages.map((msg) => {
      if (typeof msg.content === 'string') {
        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        };
      }

      // Array of ContentBlocks
      const parts: Array<{
        text?: string;
        functionCall?: { name: string; args: unknown };
        functionResponse?: { name: string; response: unknown };
      }> = [];

      for (const block of msg.content) {
        if (block.type === 'text' && block.text) {
          parts.push({ text: block.text });
        } else if (block.type === 'tool_use' && block.name) {
          parts.push({ functionCall: { name: block.name, args: block.input ?? {} } });
        } else if (block.type === 'tool_result' && block.name) {
          parts.push({
            functionResponse: {
              name: block.name,
              response: block.content ? JSON.parse(block.content) : {},
            },
          });
        }
      }

      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      };
    });
  }

  private toFunctionDeclaration(tool: ToolDef): {
    name: string;
    description: string;
    parameters?: Record<string, unknown>;
  } {
    return {
      name: tool.name,
      description: tool.description,
      parameters: Object.keys(tool.parameters).length > 0 ? tool.parameters : undefined,
    };
  }
}
