import Anthropic from '@anthropic-ai/sdk';
import { anfConfig } from './anf-config.js';
import { buildAgentContext } from './agent-context.js';
import { logActivity } from './activity-log.js';
import { RateLimitGuard } from './rate-limit-guard.js';

const anthropic = new Anthropic({
  apiKey: anfConfig.anthropicApiKey,
  baseURL: anfConfig.anthropicBaseUrl,
});

export const rateLimitGuard = new RateLimitGuard();

export interface AgentRunResult {
  response: string;
  tokens_used: number;
  cost_usd: number;
  duration_ms: number;
  tool_calls: Array<{ name: string; input: unknown; output: unknown }>;
}

export async function runAgent(
  slug: string,
  taskDescription: string,
  toolDefinitions: Anthropic.Tool[],
  toolHandlers: Record<string, (params: any) => Promise<unknown>>,
): Promise<AgentRunResult> {
  const startTime = Date.now();
  const ctx = await buildAgentContext(slug, taskDescription);

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

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: taskDescription },
  ];

  const toolCalls: AgentRunResult['tool_calls'] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  while (true) {
    // Circuit breaker: reject immediately if rate limited
    rateLimitGuard.checkOrThrow();

    let response: Anthropic.Message;
    try {
      response = await anthropic.messages.create({
        model: ctx.model,
        max_tokens: 4096,
        temperature: ctx.temperature,
        system: systemPrompt,
        tools: toolDefinitions,
        messages,
      });
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
      throw err;
    }

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find((b) => b.type === 'text');
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
        output: { response: (textBlock as any)?.text?.slice(0, 500) },
      });

      return {
        response: (textBlock as any)?.text || '',
        tokens_used,
        cost_usd,
        duration_ms,
        tool_calls: toolCalls,
      };
    }

    if (response.stop_reason === 'tool_use') {
      const assistantContent = response.content;
      messages.push({ role: 'assistant', content: assistantContent });

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

      for (const block of assistantContent) {
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

          await logActivity({
            agent_id: ctx.agent_id,
            action: 'error',
            description: `Tool ${block.name} failed: ${err.message}`,
            input: block.input as Record<string, unknown>,
          });
        }
      }

      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    break;
  }

  return {
    response: '',
    tokens_used: totalInputTokens + totalOutputTokens,
    cost_usd: 0,
    duration_ms: Date.now() - startTime,
    tool_calls: toolCalls,
  };
}
