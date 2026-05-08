// src/anf/agent-runner.ts
// Runs ANF agents using the unified LLM provider (Gemini by default, Anthropic as fallback).

import { getProvider } from '../llm/index.js';
import type { Message, ContentBlock, ToolDef } from '../llm/types.js';
import { config } from '../config.js';
import { buildAgentContext } from './agent-context.js';
import { logActivity } from './activity-log.js';
import { RateLimitGuard } from './rate-limit-guard.js';

export const rateLimitGuard = new RateLimitGuard();

export interface AgentRunResult {
  response: string;
  tokens_used: number;
  cost_usd: number;
  duration_ms: number;
  tool_calls: Array<{ name: string; input: unknown; output: unknown }>;
}

/** Convert Anthropic-style tool definitions to unified ToolDef */
function toUnifiedTools(
  defs: readonly {
    readonly name: string;
    readonly description: string;
    readonly input_schema: Record<string, unknown>;
  }[],
): ToolDef[] {
  return defs.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  }));
}

export async function runAgent(
  slug: string,
  taskDescription: string,
  toolDefinitions: readonly {
    readonly name: string;
    readonly description: string;
    readonly input_schema: Record<string, unknown>;
  }[],
  toolHandlers: Record<string, (params: any) => Promise<unknown>>,
): Promise<AgentRunResult> {
  const startTime = Date.now();
  const ctx = await buildAgentContext(slug, taskDescription);
  const provider = await getProvider();

  console.log(
    `[agent-runner] Starting ${slug}: ${taskDescription.slice(0, 80)}`,
  );

  const systemPrompt = [
    ctx.system_prompt,
    '',
    '## Memórias Relevantes',
    ...ctx.memories.map((m) => `- [${m.category}] ${m.title}: ${m.content}`),
    '',
    '## Documentos Relevantes',
    ...ctx.documents.map(
      (d) => `- [${d.doc_type}] ${d.title}: ${d.content.slice(0, 500)}`,
    ),
    '',
    '## Atividade Recente',
    ...ctx.recent_activity
      .slice(0, 10)
      .map((a) => `- ${a.created_at}: ${a.description}`),
    '',
    '## Mensagens Pendentes do Admin',
    ...ctx.pending_messages.map((m) => `- ${m.content}`),
  ].join('\n');

  const messages: Message[] = [{ role: 'user', content: taskDescription }];

  const toolCalls: AgentRunResult['tool_calls'] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const MAX_ITERATIONS = 30;
  let iteration = 0;

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    // Circuit breaker: reject immediately if rate limited
    rateLimitGuard.checkOrThrow();

    try {
      const response = await provider.chatWithTools({
        model: config.llmModel,
        maxTokens: 16384,
        temperature: ctx.temperature,
        system: systemPrompt,
        tools: toUnifiedTools(toolDefinitions),
        messages,
      });

      rateLimitGuard.recordSuccess();
      totalInputTokens += response.inputTokens;
      totalOutputTokens += response.outputTokens;

      console.log(
        `[agent-runner] ${slug} iter=${iteration} stop=${response.stopReason} tokens=${response.inputTokens}+${response.outputTokens}`,
      );

      if (response.stopReason === 'end') {
        const duration_ms = Date.now() - startTime;
        const tokens_used = totalInputTokens + totalOutputTokens;
        const cost_usd =
          (totalInputTokens * 3) / 1_000_000 +
          (totalOutputTokens * 15) / 1_000_000;

        await logActivity({
          agent_id: ctx.agent_id,
          action: 'decision',
          description: `Agent ${slug} completou tarefa: ${taskDescription.slice(0, 100)}`,
          tokens_used,
          cost_usd,
          duration_ms,
          output: { response: response.text?.slice(0, 500) },
        });

        return {
          response: response.text || '',
          tokens_used,
          cost_usd,
          duration_ms,
          tool_calls: toolCalls,
        };
      }

      if (response.stopReason === 'tool_use') {
        // Build assistant message — use raw parts when available to preserve
        // thought signatures required by Gemini 3.1+
        let assistantBlocks: ContentBlock[];
        if (response.rawAssistantParts?.length) {
          assistantBlocks = [
            { type: 'raw_parts', rawParts: response.rawAssistantParts },
          ];
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

          console.log(`[agent-runner] ${slug} calling tool: ${tc.name}`);
          try {
            const result = await handler(tc.input as any);
            console.log(`[agent-runner] ${slug} tool ${tc.name}: OK`);
            toolCalls.push({
              name: tc.name,
              input: tc.input,
              output: result,
            });
            resultBlocks.push({
              type: 'tool_result',
              id: tc.id,
              name: tc.name,
              content: JSON.stringify(result),
            });
          } catch (err: any) {
            console.error(
              `[agent-runner] ${slug} tool ${tc.name}: FAILED — ${err.message}`,
            );
            toolCalls.push({
              name: tc.name,
              input: tc.input,
              output: { error: err.message },
            });
            resultBlocks.push({
              type: 'tool_result',
              id: tc.id,
              name: tc.name,
              content: `Erro: ${err.message}`,
              is_error: true,
            });

            await logActivity({
              agent_id: ctx.agent_id,
              action: 'error',
              description: `Tool ${tc.name} failed: ${err.message}`,
              input: tc.input as Record<string, unknown>,
            });
          }
        }

        messages.push({ role: 'user', content: resultBlocks });
        continue;
      }

      // Unknown stop reason — break
      break;
    } catch (err: any) {
      if (err?.status === 429 || err?.error?.type === 'rate_limit_error') {
        const backoff = RateLimitGuard.extractBackoffSeconds(
          err.message || err.error?.message || '',
        );
        rateLimitGuard.recordRateLimit(backoff);
        throw new Error(
          `Rate limited — cooling down for ${backoff}s. Will resume automatically.`,
        );
      }
      // Any other LLM error (502, timeout, network) → exponential backoff
      rateLimitGuard.recordError();
      throw err;
    }
  }

  return {
    response: '',
    tokens_used: totalInputTokens + totalOutputTokens,
    cost_usd: 0,
    duration_ms: Date.now() - startTime,
    tool_calls: toolCalls,
  };
}
