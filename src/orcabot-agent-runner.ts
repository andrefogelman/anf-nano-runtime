// src/orcabot-agent-runner.ts
// Runs OrcaBot specialist agents (estrutural, hidraulico, eletricista) in-process
// using the unified LLM provider with tool-use loop.

import { readFile } from 'fs/promises';
import { join } from 'path';
import { config } from './config.js';
import { getProvider } from './llm/index.js';
import type { Message, ContentBlock, ToolDef } from './llm/types.js';

export interface AgentRunResult {
  response: string;
  tokens_used: number;
  tool_calls: Array<{ name: string; input: unknown; output: unknown }>;
  duration_ms: number;
}

async function loadSystemPrompt(slug: string): Promise<string> {
  const promptPath = join(process.cwd(), 'agents', slug, 'CLAUDE.md');
  return readFile(promptPath, 'utf-8');
}

export async function runOrcabotAgent(
  slug: string,
  taskDescription: string,
  toolDefinitions: ToolDef[],
  toolHandlers: Record<string, (params: any) => Promise<unknown>>,
): Promise<AgentRunResult> {
  const startTime = Date.now();
  const provider = await getProvider();
  const model = config.llmModel;
  const systemPrompt = await loadSystemPrompt(slug);

  const messages: Message[] = [
    { role: 'user', content: taskDescription },
  ];

  const toolCalls: AgentRunResult['tool_calls'] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const MAX_ITERATIONS = 30;
  let iteration = 0;

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    const response = await provider.chatWithTools({
      model,
      maxTokens: 16384,
      temperature: 0.2,
      system: systemPrompt,
      tools: toolDefinitions,
      messages,
    });

    totalInputTokens += response.inputTokens;
    totalOutputTokens += response.outputTokens;

    console.log(`[agent-runner] ${slug} iter=${iteration} stop=${response.stopReason} tools=${response.toolCalls.length} text=${response.text.slice(0, 200)}`);

    if (response.stopReason === 'end') {
      return {
        response: response.text,
        tokens_used: totalInputTokens + totalOutputTokens,
        tool_calls: toolCalls,
        duration_ms: Date.now() - startTime,
      };
    }

    if (response.stopReason === 'tool_use') {
      // Build assistant message — use raw parts when available to preserve
      // thought signatures required by Gemini 3.1+
      let assistantBlocks: ContentBlock[];
      if (response.rawAssistantParts?.length) {
        assistantBlocks = [{ type: 'raw_parts', rawParts: response.rawAssistantParts }];
      } else {
        assistantBlocks = [];
        if (response.text) {
          assistantBlocks.push({ type: 'text', text: response.text });
        }
        for (const tc of response.toolCalls) {
          assistantBlocks.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.input,
          });
        }
      }
      messages.push({ role: 'assistant', content: assistantBlocks });

      // Execute tools and build results
      const resultBlocks: ContentBlock[] = [];

      for (const tc of response.toolCalls) {
        const handler = toolHandlers[tc.name];
        if (!handler) {
          resultBlocks.push({
            type: 'tool_result',
            id: tc.id,
            name: tc.name,
            content: `Erro: ferramenta "${tc.name}" não encontrada`,
            is_error: true,
          });
          continue;
        }

        try {
          const result = await handler(tc.input as any);
          toolCalls.push({ name: tc.name, input: tc.input, output: result });
          resultBlocks.push({
            type: 'tool_result',
            id: tc.id,
            name: tc.name,
            content: JSON.stringify(result),
          });
        } catch (err: any) {
          toolCalls.push({ name: tc.name, input: tc.input, output: { error: err.message } });
          resultBlocks.push({
            type: 'tool_result',
            id: tc.id,
            name: tc.name,
            content: `Erro: ${err.message}`,
            is_error: true,
          });
        }
      }

      messages.push({ role: 'user', content: resultBlocks });
      continue;
    }

    break;
  }

  return {
    response: '',
    tokens_used: totalInputTokens + totalOutputTokens,
    tool_calls: toolCalls,
    duration_ms: Date.now() - startTime,
  };
}
