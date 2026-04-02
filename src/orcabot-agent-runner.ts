// src/orcabot-agent-runner.ts
// Runs OrcaBot specialist agents (estrutural, hidraulico, eletricista) in-process
// using the Anthropic SDK with tools from agent-registry.

import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { config } from './config.js';

const anthropic = new Anthropic({
  apiKey: config.anthropicApiKey || 'placeholder',
  baseURL: `http://localhost:${config.llmProxyPort}`,
});

export interface AgentRunResult {
  response: string;
  tokens_used: number;
  tool_calls: Array<{ name: string; input: unknown; output: unknown }>;
  duration_ms: number;
}

/**
 * Load the system prompt for an OrcaBot agent from agents/{slug}/CLAUDE.md
 */
async function loadSystemPrompt(slug: string): Promise<string> {
  const promptPath = join(process.cwd(), 'agents', slug, 'CLAUDE.md');
  return readFile(promptPath, 'utf-8');
}

/**
 * Run an OrcaBot specialist agent with the given task description and tools.
 * Uses a simple tool-use loop until the agent is done.
 */
export async function runOrcabotAgent(
  slug: string,
  taskDescription: string,
  toolDefinitions: Anthropic.Tool[],
  toolHandlers: Record<string, (params: any) => Promise<unknown>>,
): Promise<AgentRunResult> {
  const startTime = Date.now();
  const systemPrompt = await loadSystemPrompt(slug);

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: taskDescription },
  ];

  const toolCalls: AgentRunResult['tool_calls'] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const MAX_ITERATIONS = 30;
  let iteration = 0;

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0.2,
      system: systemPrompt,
      tools: toolDefinitions,
      messages,
    });

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find((b) => b.type === 'text');
      return {
        response: (textBlock as any)?.text || '',
        tokens_used: totalInputTokens + totalOutputTokens,
        tool_calls: toolCalls,
        duration_ms: Date.now() - startTime,
      };
    }

    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        const handler = toolHandlers[block.name];
        if (!handler) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: `Erro: ferramenta "${block.name}" não encontrada`,
            is_error: true,
          });
          continue;
        }

        try {
          const result = await handler(block.input as any);
          toolCalls.push({
            name: block.name,
            input: block.input,
            output: result,
          });
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        } catch (err: any) {
          toolCalls.push({
            name: block.name,
            input: block.input,
            output: { error: err.message },
          });
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: `Erro: ${err.message}`,
            is_error: true,
          });
        }
      }

      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    // Unknown stop reason — break
    break;
  }

  return {
    response: '',
    tokens_used: totalInputTokens + totalOutputTokens,
    tool_calls: toolCalls,
    duration_ms: Date.now() - startTime,
  };
}
