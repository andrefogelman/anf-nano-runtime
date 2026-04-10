import {
  toolDefinitions as suprimentosDefs,
  toolHandlers as suprimentosHandlers,
} from '../../agents/suprimentos/tools.js';
import {
  toolDefinitions as financeiroDefs,
  toolHandlers as financeiroHandlers,
} from '../../agents/financeiro/tools.js';
import {
  toolDefinitions as engenhariaDefs,
  toolHandlers as engenhariaHandlers,
} from '../../agents/engenharia/tools.js';
import {
  toolDefinitions as orquestradorDefs,
  toolHandlers as orquestradorHandlers,
} from '../../agents/orquestrador/tools.js';
import {
  toolDefinitions as orcamentistaDefs,
  toolHandlers as orcamentistaHandlers,
} from '../../agents/orcamentista/tools.js';

export interface AgentToolDef {
  readonly name: string;
  readonly description: string;
  readonly input_schema: Record<string, unknown>;
}

export interface AgentToolset {
  definitions: readonly AgentToolDef[];
  handlers: Record<string, (params: any) => Promise<unknown>>;
}

const registry: Record<string, AgentToolset> = {
  suprimentos: {
    definitions: suprimentosDefs,
    handlers: suprimentosHandlers,
  },
  financeiro: {
    definitions: financeiroDefs,
    handlers: financeiroHandlers,
  },
  engenharia: {
    definitions: engenhariaDefs,
    handlers: engenhariaHandlers,
  },
  orquestrador: {
    definitions: orquestradorDefs,
    handlers: orquestradorHandlers,
  },
  orcamentista: {
    definitions: orcamentistaDefs,
    handlers: orcamentistaHandlers,
  },
};

export function getAgentTools(slug: string): AgentToolset | null {
  return registry[slug] || null;
}

export function getAllAgentSlugs(): string[] {
  return Object.keys(registry);
}
