# Hybrid LLM Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple OrcaBot from Anthropic SDK with a provider-agnostic LLM abstraction, defaulting to Gemini 2.5 Pro.

**Architecture:** A `LlmProvider` interface with `chat()` and `chatWithTools()` methods. Two implementations: `GeminiProvider` (default, `@google/genai` SDK) and `AnthropicProvider` (standby, `@anthropic-ai/sdk`). Factory singleton selects provider via `LLM_PROVIDER` env var. All consumers use the unified interface.

**Tech Stack:** TypeScript, `@google/genai` v1.48+, `@anthropic-ai/sdk` (existing), Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/llm/types.ts` | Create | Unified interfaces: `LlmProvider`, `ChatOpts`, `ToolDef`, `ChatResult`, `ToolChatResult`, `Message`, `ContentBlock` |
| `src/llm/gemini-provider.ts` | Create | `@google/genai` implementation of `LlmProvider` — chat + tool-use |
| `src/llm/anthropic-provider.ts` | Create | `@anthropic-ai/sdk` implementation of `LlmProvider` — chat + tool-use (standby) |
| `src/llm/index.ts` | Create | Factory singleton `getProvider()` with dynamic import |
| `src/llm/__tests__/gemini-provider.test.ts` | Create | Unit tests for GeminiProvider |
| `src/llm/__tests__/anthropic-provider.test.ts` | Create | Unit tests for AnthropicProvider |
| `src/llm/__tests__/index.test.ts` | Create | Unit tests for factory |
| `src/orcabot-agent-runner.ts` | Modify | Replace Anthropic SDK with provider interface |
| `src/agent-registry.ts` | Modify | Replace `Anthropic.Tool` type with unified `ToolDef` |
| `src/channels/api-channel.ts` | Modify:370-454 | Replace `callLlm()`/`callGemini()` with `provider.chat()` |
| `src/index.ts` | Modify:589-592 | Conditionally start llm-proxy |
| `src/config.ts` | Modify | Add `llmProvider` config field |

---

### Task 1: Install `@google/genai` and create types

**Files:**
- Create: `src/llm/types.ts`
- Modify: `package.json`

- [ ] **Step 1: Install the Google AI SDK**

```bash
bun add @google/genai
```

- [ ] **Step 2: Create `src/llm/types.ts`**

```typescript
// src/llm/types.ts
// Unified LLM provider interface — provider-agnostic types for chat and tool-use.

export interface Message {
  role: 'user' | 'assistant' | 'model';
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
  content?: string;
  is_error?: boolean;
}

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema object
}

export interface ChatOpts {
  model: string;
  system: string;
  messages: Message[];
  maxTokens?: number;
  temperature?: number;
}

export interface ToolChatOpts extends ChatOpts {
  tools: ToolDef[];
}

export interface ChatResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ToolChatResult extends ChatResult {
  stopReason: 'end' | 'tool_use';
  toolCalls: Array<{ id: string; name: string; input: unknown }>;
}

export interface LlmProvider {
  chat(opts: ChatOpts): Promise<ChatResult>;
  chatWithTools(opts: ToolChatOpts): Promise<ToolChatResult>;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `bun run typecheck`
Expected: No errors related to `src/llm/types.ts`

- [ ] **Step 4: Commit**

```bash
git add src/llm/types.ts package.json bun.lockb
git commit -m "feat(llm): add unified provider types and install @google/genai"
```

---

### Task 2: Implement GeminiProvider

**Files:**
- Create: `src/llm/gemini-provider.ts`
- Create: `src/llm/__tests__/gemini-provider.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/llm/__tests__/gemini-provider.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the @google/genai SDK
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
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
        model: 'gemini-2.5-pro',
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
          model: 'gemini-2.5-pro',
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
        functionCalls: [
          { name: 'get_weather', args: { city: 'SP' } },
        ],
        usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 15 },
      });

      const result = await provider.chatWithTools({
        model: 'gemini-2.5-pro',
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
        model: 'gemini-2.5-pro',
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/llm/__tests__/gemini-provider.test.ts`
Expected: FAIL — `Cannot find module '../gemini-provider.js'`

- [ ] **Step 3: Implement GeminiProvider**

Create `src/llm/gemini-provider.ts`:

```typescript
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
  ContentBlock,
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
        toolCalls: functionCalls.map((fc, i) => ({
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

  private buildContents(messages: Message[]): Array<{ role: string; parts: Array<{ text?: string; functionResponse?: { name: string; response: unknown } }> }> {
    return messages.map((msg) => {
      if (typeof msg.content === 'string') {
        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        };
      }

      // Array of ContentBlocks
      const parts: Array<{ text?: string; functionCall?: { name: string; args: unknown }; functionResponse?: { name: string; response: unknown } }> = [];
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

  private toFunctionDeclaration(tool: ToolDef): { name: string; description: string; parameters?: Record<string, unknown> } {
    return {
      name: tool.name,
      description: tool.description,
      parameters: Object.keys(tool.parameters).length > 0 ? tool.parameters : undefined,
    };
  }
}
```

- [ ] **Step 4: Run tests**

Run: `bun run test src/llm/__tests__/gemini-provider.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/llm/gemini-provider.ts src/llm/__tests__/gemini-provider.test.ts
git commit -m "feat(llm): implement GeminiProvider with tool-use support"
```

---

### Task 3: Implement AnthropicProvider (standby)

**Files:**
- Create: `src/llm/anthropic-provider.ts`
- Create: `src/llm/__tests__/anthropic-provider.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/llm/__tests__/anthropic-provider.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/llm/__tests__/anthropic-provider.test.ts`
Expected: FAIL — `Cannot find module '../anthropic-provider.js'`

- [ ] **Step 3: Implement AnthropicProvider**

Create `src/llm/anthropic-provider.ts`:

```typescript
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
  ContentBlock,
  ToolDef,
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
```

- [ ] **Step 4: Run tests**

Run: `bun run test src/llm/__tests__/anthropic-provider.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/llm/anthropic-provider.ts src/llm/__tests__/anthropic-provider.test.ts
git commit -m "feat(llm): implement AnthropicProvider (standby) with tool-use support"
```

---

### Task 4: Create factory and config

**Files:**
- Create: `src/llm/index.ts`
- Create: `src/llm/__tests__/index.test.ts`
- Modify: `src/config.ts`

- [ ] **Step 1: Write the failing test**

Create `src/llm/__tests__/index.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock both providers
vi.mock('../gemini-provider.js', () => ({
  GeminiProvider: vi.fn().mockImplementation(() => ({
    chat: vi.fn(),
    chatWithTools: vi.fn(),
  })),
}));

vi.mock('../anthropic-provider.js', () => ({
  AnthropicProvider: vi.fn().mockImplementation(() => ({
    chat: vi.fn(),
    chatWithTools: vi.fn(),
  })),
}));

describe('getProvider', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('returns GeminiProvider by default', async () => {
    vi.stubEnv('LLM_PROVIDER', 'gemini');
    vi.stubEnv('GOOGLE_API_KEY', 'test');
    const { getProvider } = await import('../index.js');
    const provider = await getProvider();
    expect(provider).toBeDefined();
    expect(provider.chat).toBeDefined();
    expect(provider.chatWithTools).toBeDefined();
  });

  it('returns AnthropicProvider when configured', async () => {
    vi.stubEnv('LLM_PROVIDER', 'anthropic');
    vi.stubEnv('ANTHROPIC_API_KEY', 'test');
    const { getProvider } = await import('../index.js');
    const provider = await getProvider();
    expect(provider).toBeDefined();
  });

  it('throws on unknown provider', async () => {
    vi.stubEnv('LLM_PROVIDER', 'openai');
    const { getProvider } = await import('../index.js');
    await expect(getProvider()).rejects.toThrow('Unknown LLM_PROVIDER: openai');
  });

  it('returns same instance on repeated calls', async () => {
    vi.stubEnv('LLM_PROVIDER', 'gemini');
    vi.stubEnv('GOOGLE_API_KEY', 'test');
    const { getProvider } = await import('../index.js');
    const a = await getProvider();
    const b = await getProvider();
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/llm/__tests__/index.test.ts`
Expected: FAIL — `Cannot find module '../index.js'`

- [ ] **Step 3: Implement factory**

Create `src/llm/index.ts`:

```typescript
// src/llm/index.ts
// Factory singleton — selects LLM provider based on LLM_PROVIDER env var.

import type { LlmProvider } from './types.js';

export type { LlmProvider, ChatOpts, ChatResult, ToolChatOpts, ToolChatResult, ToolDef, Message, ContentBlock } from './types.js';

let _provider: LlmProvider | null = null;

export async function getProvider(): Promise<LlmProvider> {
  if (_provider) return _provider;

  const name = process.env.LLM_PROVIDER || 'gemini';

  if (name === 'gemini') {
    const { GeminiProvider } = await import('./gemini-provider.js');
    _provider = new GeminiProvider();
  } else if (name === 'anthropic') {
    const { AnthropicProvider } = await import('./anthropic-provider.js');
    _provider = new AnthropicProvider();
  } else {
    throw new Error(`Unknown LLM_PROVIDER: ${name}`);
  }

  return _provider;
}
```

- [ ] **Step 4: Add `llmProvider` to config**

In `src/config.ts`, add to the `config` object after `llmMode`:

```typescript
  llmProvider: optional('LLM_PROVIDER', 'gemini') as 'gemini' | 'anthropic',
  llmModel: optional('LLM_MODEL', 'gemini-2.5-pro'),
```

- [ ] **Step 5: Run tests**

Run: `bun run test src/llm/__tests__/index.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 6: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/llm/index.ts src/llm/__tests__/index.test.ts src/config.ts
git commit -m "feat(llm): add provider factory and config fields"
```

---

### Task 5: Refactor `orcabot-agent-runner.ts`

**Files:**
- Modify: `src/orcabot-agent-runner.ts`
- Modify: `src/agent-registry.ts`

- [ ] **Step 1: Update `agent-registry.ts` to use unified `ToolDef`**

Replace the entire file `src/agent-registry.ts`:

```typescript
import type { ToolDef } from './llm/types.js';

import {
  toolDefinitions as orcamentistaDefs,
  toolHandlers as orcamentistaHandlers,
} from '../agents/orcamentista/tools.js';
import {
  toolDefinitions as estruturalDefs,
  toolHandlers as estruturalHandlers,
} from '../agents/estrutural/tools.js';
import {
  toolDefinitions as hidraulicoDefs,
  toolHandlers as hidraulicoHandlers,
} from '../agents/hidraulico/tools.js';
import {
  toolDefinitions as eletricistaDefs,
  toolHandlers as eletricistaHandlers,
} from '../agents/eletricista/tools.js';

export interface AgentToolset {
  definitions: ToolDef[];
  handlers: Record<string, (params: any) => Promise<unknown>>;
}

/**
 * Convert Anthropic-style tool defs (input_schema) to unified ToolDef (parameters).
 */
function toUnifiedDefs(defs: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>): ToolDef[] {
  return defs.map((d) => ({
    name: d.name,
    description: d.description,
    parameters: d.input_schema,
  }));
}

const registry: Record<string, AgentToolset> = {
  orcamentista: {
    definitions: toUnifiedDefs(orcamentistaDefs as any),
    handlers: orcamentistaHandlers,
  },
  estrutural: {
    definitions: toUnifiedDefs(estruturalDefs as any),
    handlers: estruturalHandlers,
  },
  hidraulico: {
    definitions: toUnifiedDefs(hidraulicoDefs as any),
    handlers: hidraulicoHandlers,
  },
  eletricista: {
    definitions: toUnifiedDefs(eletricistaDefs as any),
    handlers: eletricistaHandlers,
  },
};

export function getAgentTools(slug: string): AgentToolset | null {
  return registry[slug] || null;
}

export function getAllAgentSlugs(): string[] {
  return Object.keys(registry);
}
```

- [ ] **Step 2: Rewrite `orcabot-agent-runner.ts`**

Replace the entire file `src/orcabot-agent-runner.ts`:

```typescript
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
      maxTokens: 4096,
      temperature: 0.2,
      system: systemPrompt,
      tools: toolDefinitions,
      messages,
    });

    totalInputTokens += response.inputTokens;
    totalOutputTokens += response.outputTokens;

    if (response.stopReason === 'end') {
      return {
        response: response.text,
        tokens_used: totalInputTokens + totalOutputTokens,
        tool_calls: toolCalls,
        duration_ms: Date.now() - startTime,
      };
    }

    if (response.stopReason === 'tool_use') {
      // Build assistant message with text + tool calls
      const assistantBlocks: ContentBlock[] = [];
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
```

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

- [ ] **Step 4: Run existing delegation-engine test**

Run: `bun run test src/__tests__/delegation-engine.test.ts`
Expected: PASS (it mocks `runOrcabotAgent`)

- [ ] **Step 5: Commit**

```bash
git add src/orcabot-agent-runner.ts src/agent-registry.ts
git commit -m "refactor(agent-runner): use unified LLM provider instead of Anthropic SDK"
```

---

### Task 6: Refactor `api-channel.ts`

**Files:**
- Modify: `src/channels/api-channel.ts:370-454`

- [ ] **Step 1: Replace `callLlm` / `callGemini` with provider**

In `src/channels/api-channel.ts`, replace lines 373-454 (the `LLM_BASE_URL`, `LLM_AUTH_TOKEN`, `LLM_MODEL`, `GOOGLE_API_KEY` constants and the `callLlm()` and `callGemini()` functions) with:

```typescript
  // ── Process file (PDF/DWG/DXF) with LLM ──────────────────────────────────

  async function callLlm(system: string, userContent: string): Promise<string> {
    const { getProvider } = await import('../llm/index.js');
    const { config } = await import('../config.js');
    const provider = await getProvider();
    const result = await provider.chat({
      model: config.llmModel,
      system,
      messages: [{ role: 'user', content: userContent }],
      maxTokens: 16384,
      temperature: 0.2,
    });
    return result.text;
  }
```

This replaces 4 constants and 2 functions (~80 lines) with 1 function (~12 lines). The `callLlm` name is preserved so that all call sites (`line 344`, `line 797`) continue to work unchanged.

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/channels/api-channel.ts
git commit -m "refactor(api-channel): use unified LLM provider instead of direct fetch"
```

---

### Task 7: Conditionally start llm-proxy

**Files:**
- Modify: `src/index.ts:589-592`

- [ ] **Step 1: Wrap llm-proxy start in provider check**

In `src/index.ts`, replace lines 589-592:

```typescript
  // Start LLM proxy (Claude Max session, no API key fallback)
  const { startLlmProxy } = await import('./llm-proxy.js');
  startLlmProxy();
  logger.info('LLM proxy started');
```

With:

```typescript
  // Start LLM proxy only when using Anthropic provider
  if (config.llmProvider === 'anthropic') {
    const { startLlmProxy } = await import('./llm-proxy.js');
    startLlmProxy();
    logger.info('LLM proxy started (anthropic mode)');
  } else {
    logger.info(`LLM provider: ${config.llmProvider}, model: ${config.llmModel} — proxy skipped`);
  }
```

- [ ] **Step 2: Add config import if not already present**

Verify `config` is imported at the top of `src/index.ts`. If not, add:

```typescript
import { config } from './config.js';
```

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "refactor(index): conditionally start llm-proxy based on LLM_PROVIDER"
```

---

### Task 8: Update `.env` and run full test suite

**Files:**
- Modify: `.env` (on W5 server)
- No new files

- [ ] **Step 1: Run full test suite locally**

Run: `bun run test`
Expected: All tests PASS

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

- [ ] **Step 3: Update `.env` on W5**

Add/update these env vars:

```env
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.5-pro
GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
```

The existing Anthropic env vars can stay — they're ignored when `LLM_PROVIDER=gemini`.

- [ ] **Step 4: Build and verify**

```bash
bun run build
```

Expected: Compiles with no errors. Note: after build, verify `dist/src/anf/start.js` is still a no-op (rebuild overwrites it).

- [ ] **Step 5: Commit all remaining changes**

```bash
git add -A
git commit -m "feat(llm): complete hybrid provider migration, default to Gemini 2.5 Pro"
```
