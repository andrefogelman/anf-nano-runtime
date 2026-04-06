// src/llm/anthropic-provider.ts
// Anthropic implementation of LlmProvider — standby, activated by LLM_PROVIDER=anthropic.

import Anthropic from '@anthropic-ai/sdk';
import type {
  LlmProvider,
  ChatOpts,
  ChatResult,
  ToolChatOpts,
  ToolChatResult,
  Message,
} from './types.js';

export class AnthropicProvider implements LlmProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder',
      baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
    });
  }

  async chat(opts: ChatOpts): Promise<ChatResult> {
    const response = await this.client.messages.create({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.2,
      system: opts.system,
      messages: this.buildMessages(opts.messages),
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }

  async chatWithTools(opts: ToolChatOpts): Promise<ToolChatResult> {
    const tools: Anthropic.Tool[] = opts.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Anthropic.Tool['input_schema'],
    }));

    const response = await this.client.messages.create({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.2,
      system: opts.system,
      messages: this.buildMessages(opts.messages),
      tools: tools.length > 0 ? tools : undefined,
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const toolCalls = response.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      .map((b) => ({ id: b.id, name: b.name, input: b.input }));

    const stopReason = response.stop_reason === 'tool_use' ? 'tool_use' as const : 'end' as const;

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      stopReason,
      toolCalls,
    };
  }

  private buildMessages(messages: Message[]): Anthropic.MessageParam[] {
    return messages.map((msg) => {
      if (typeof msg.content === 'string') {
        return { role: msg.role as 'user' | 'assistant', content: msg.content };
      }

      const blocks: Anthropic.ContentBlockParam[] = msg.content.map((block) => {
        if (block.type === 'text') {
          return { type: 'text' as const, text: block.text ?? '' };
        }
        if (block.type === 'tool_use') {
          return {
            type: 'tool_use' as const,
            id: block.id ?? '',
            name: block.name ?? '',
            input: block.input ?? {},
          };
        }
        // tool_result
        return {
          type: 'tool_result' as const,
          tool_use_id: block.id ?? '',
          content: block.content ?? '',
          is_error: block.is_error,
        };
      });

      return { role: msg.role as 'user' | 'assistant', content: blocks };
    });
  }
}
