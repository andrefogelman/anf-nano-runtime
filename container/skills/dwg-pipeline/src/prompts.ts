// container/skills/dwg-pipeline/src/prompts.ts

/**
 * System prompt for LLM-based layer classification.
 * Used as a fallback when regex and content heuristics fail.
 */
export const LAYER_CLASSIFICATION_PROMPT = `Voce e um especialista em projetos de construcao civil brasileiros. Sua tarefa e classificar layers de arquivos DWG/DXF em disciplinas.

As disciplinas possiveis sao:
- "arq" — Arquitetonico (paredes, ambientes, portas, janelas, pisos, forros)
- "est" — Estrutural (pilares, vigas, lajes, fundacoes, armacoes)
- "hid" — Hidraulico (tubulacoes de agua, esgoto, pluvial, registros, ralos)
- "ele" — Eletrico (tomadas, pontos de luz, interruptores, condutos, quadros)
- "cotas" — Cotas e dimensoes
- "anotacoes" — Textos e anotacoes gerais
- "ignorar" — Layers auxiliares sem valor (Defpoints, layer 0 vazio, viewport, etc.)

Voce recebera:
1. Nome do layer
2. Amostra de entidades (tipo, dimensoes, posicao)
3. Nomes de blocos inseridos nesse layer
4. Textos encontrados nesse layer

Responda APENAS com um JSON no formato:
{
  "disciplina": "arq|est|hid|ele|cotas|anotacoes|ignorar",
  "justificativa": "Breve explicacao em portugues"
}

Nao inclua nenhum texto fora do JSON.`;

/**
 * System prompt for LLM-based block classification.
 * Used when a block has a generic name (Block1, XPTO, etc.).
 */
export const BLOCK_CLASSIFICATION_PROMPT = `Voce e um especialista em projetos de construcao civil brasileiros. Sua tarefa e identificar o que um bloco (block) de DWG/DXF representa, baseado em seu conteudo geometrico.

Os componentes possiveis sao:
- "tomada" (disciplina: ele, unidade: pt) — tomadas eletricas
- "ponto_iluminacao" (disciplina: ele, unidade: pt) — pontos de luz no teto
- "interruptor" (disciplina: ele, unidade: un) — interruptores de luz
- "registro" (disciplina: hid, unidade: un) — registros hidraulicos
- "ralo" (disciplina: hid, unidade: un) — ralos de piso
- "porta" (disciplina: arq, unidade: un) — portas
- "janela" (disciplina: arq, unidade: un) — janelas
- "pilar" (disciplina: est, unidade: un) — pilares estruturais
- "vaso_sanitario" (disciplina: hid, unidade: un) — vasos sanitarios
- "pia" (disciplina: hid, unidade: un) — pias/lavatorios
- "chuveiro" (disciplina: hid, unidade: un) — chuveiros/duchas
- "quadro_eletrico" (disciplina: ele, unidade: un) — quadros de distribuicao
- "ar_condicionado" (disciplina: ele, unidade: un) — pontos de ar condicionado
- "desconhecido" (disciplina: geral, unidade: un) — nao foi possivel identificar

Voce recebera:
1. Nome do bloco
2. Lista de entidades internas (tipo geometrico, dimensoes)
3. Contagem de insercoes no desenho
4. Layer onde esta inserido

Responda APENAS com um JSON no formato:
{
  "componente": "nome_do_componente",
  "disciplina": "arq|est|hid|ele|geral",
  "unidade": "pt|un|m",
  "justificativa": "Breve explicacao em portugues"
}

Se nao for possivel identificar com confianca, use "desconhecido".
Nao inclua nenhum texto fora do JSON.`;

/**
 * Build the user message for layer classification.
 */
export function buildLayerClassificationMessage(
  layerName: string,
  sampleEntities: Array<{ type: string; layer: string; length?: number; area?: number }>,
  blockNames: string[],
  textContents: string[]
): string {
  return `Layer: "${layerName}"

Entidades (amostra de ${sampleEntities.length}):
${sampleEntities.map((e) => `  - ${e.type}${e.length ? ` (comprimento: ${e.length})` : ""}${e.area ? ` (area: ${e.area})` : ""}`).join("\n")}

Blocos inseridos neste layer: ${blockNames.length > 0 ? blockNames.join(", ") : "nenhum"}

Textos neste layer: ${textContents.length > 0 ? textContents.slice(0, 10).join(", ") : "nenhum"}`;
}

/**
 * Build the user message for block classification.
 */
export function buildBlockClassificationMessage(
  blockName: string,
  internalEntities: Array<{ type: string; layer: string }>,
  count: number,
  insertionLayer: string
): string {
  return `Bloco: "${blockName}"
Insercoes no desenho: ${count}
Layer de insercao: "${insertionLayer}"

Entidades internas (${internalEntities.length}):
${internalEntities.map((e) => `  - ${e.type} (layer: ${e.layer})`).join("\n")}`;
}
