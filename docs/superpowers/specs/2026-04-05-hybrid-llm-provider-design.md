# Hybrid LLM Provider Architecture

**Date:** 2026-04-05
**Status:** Approved
**Goal:** Decouple OrcaBot from Anthropic SDK, enable switching between LLM providers via env vars, keep Anthropic in standby.

---

## Problem

All LLM calls are tightly coupled to Anthropic:
- `api-channel.ts` uses raw fetch to Anthropic API (via llm-proxy)
- `orcabot-agent-runner.ts` uses `@anthropic-ai/sdk` directly with hardcoded model
- Claude Max rate limits block the system

## Design

### Provider Interface

```typescript
// src/llm/types.ts

export interface Message {
  role: 'user' | 'assistant';
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
  parameters: Record<string, unknown>; // JSON Schema
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

### Provider Implementations

#### GeminiProvider (`src/llm/gemini-provider.ts`)

- Uses `@google/genai` SDK (official Google AI SDK)
- `chat()` → `generateContent` with system instruction
- `chatWithTools()` → `generateContent` with `functionDeclarations`
- Maps Gemini `functionCall` responses to unified `ToolChatResult`
- Maps unified `ToolDef.parameters` (JSON Schema) to Gemini's `FunctionDeclaration` format

#### AnthropicProvider (`src/llm/anthropic-provider.ts`)

- Uses `@anthropic-ai/sdk` (kept as dependency, standby)
- `chat()` → `messages.create`
- `chatWithTools()` → `messages.create` with `tools` param
- Maps Anthropic `tool_use` blocks to unified `ToolChatResult`
- Supports both API key mode and llm-proxy mode (via `ANTHROPIC_BASE_URL`)

#### Factory (`src/llm/index.ts`)

```typescript
import { LlmProvider } from './types.js';

let _provider: LlmProvider | null = null;

export function getProvider(): LlmProvider {
  if (!_provider) {
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
  }
  return _provider;
}
```

Dynamic import ensures only the active provider's SDK is loaded.

### Environment Variables

```env
# Required
LLM_PROVIDER=gemini              # "gemini" | "anthropic"
LLM_MODEL=gemini-2.5-pro         # model ID for the active provider

# Gemini
GOOGLE_API_KEY=AIzaSy...

# Anthropic (standby)
ANTHROPIC_API_KEY=sk-...         # optional, for API key mode
ANTHROPIC_BASE_URL=              # optional, for llm-proxy mode
LLM_MODE=max                    # "max" | "apikey" (Anthropic-specific)
CLAUDE_MAX_SESSION_TOKEN=        # optional, for max mode
CLAUDE_MAX_COOKIES=              # optional, for max mode
```

### Consumer Changes

#### `api-channel.ts`

Before:
```typescript
const res = await fetch(`${LLM_BASE_URL}/v1/messages`, { ... });
```

After:
```typescript
import { getProvider } from '../llm/index.js';

const provider = getProvider();
const result = await provider.chat({
  model: process.env.LLM_MODEL || 'gemini-2.5-pro',
  system: systemPrompt,
  messages: [{ role: 'user', content: userContent }],
  maxTokens: 16384,
});
return result.text;
```

The separate `callLlm()` and `callGemini()` functions collapse into one call.

#### `orcabot-agent-runner.ts`

Before:
```typescript
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic({ ... });
// ... Anthropic-specific tool-use loop
```

After:
```typescript
import { getProvider } from './llm/index.js';

const provider = getProvider();
const model = process.env.LLM_MODEL || 'gemini-2.5-pro';

// Tool-use loop using unified interface
while (iteration < MAX_ITERATIONS) {
  const response = await provider.chatWithTools({
    model,
    system: systemPrompt,
    messages,
    tools: unifiedToolDefs,
    maxTokens: 4096,
    temperature: 0.2,
  });

  if (response.stopReason === 'end') {
    return { response: response.text, ... };
  }

  if (response.stopReason === 'tool_use') {
    // Execute tools, append results to messages
    // Same logic as today, but using unified types
  }
}
```

Tool definitions are converted from Anthropic format to unified `ToolDef[]` at the call site.

### Tool Definition Mapping

Anthropic tools use `input_schema`, Gemini uses `parameters`. The unified `ToolDef` uses `parameters` (JSON Schema). Each provider maps internally:

- **GeminiProvider**: passes `parameters` directly to `functionDeclarations`
- **AnthropicProvider**: maps `parameters` → `input_schema`

### What Stays

- `llm-proxy.ts` — stays in codebase, only starts if `LLM_PROVIDER=anthropic`
- `@anthropic-ai/sdk` — stays in `package.json`, only imported dynamically when active
- `delegation-engine.ts` — no changes, calls `runOrcabotAgent()` as before
- Tool definitions and handlers in agent registry — same shape
- `container/skills/*` — PDF/DXF pipeline unchanged

### What Dies

- `callGemini()` in api-channel.ts — absorbed by GeminiProvider
- `callLlm()` in api-channel.ts — replaced by `provider.chat()`
- Hardcoded model strings — all read from `LLM_MODEL` env var

### File Structure

```
src/llm/
  types.ts              — interfaces (LlmProvider, ChatOpts, ToolDef, etc.)
  index.ts              — factory singleton (getProvider)
  gemini-provider.ts    — @google/genai implementation
  anthropic-provider.ts — @anthropic-ai/sdk implementation (standby)
```

### Testing

- Unit tests for each provider with mocked SDK calls
- Integration test: tool-use loop with a mock tool handler
- Existing `delegation-engine.test.ts` stays unchanged (mocks `runOrcabotAgent`)

### Migration

1. Create `src/llm/` with types, factory, both providers
2. Refactor `orcabot-agent-runner.ts` to use provider interface
3. Refactor `api-channel.ts` to use provider interface
4. Conditionally start llm-proxy only when `LLM_PROVIDER=anthropic`
5. Update `.env` on W5: `LLM_PROVIDER=gemini`, `LLM_MODEL=gemini-2.5-pro`
6. Test tool-use loop end-to-end with Gemini
