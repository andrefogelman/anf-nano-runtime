import { readFile } from "node:fs/promises";
import { ProposalOutputSchema, CONFIDENCE_THRESHOLD, type ProposalOutput } from "./types.js";

export async function extractProposalItems(
  pdfPath: string,
  _textContent: string
): Promise<ProposalOutput> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY or GOOGLE_API_KEY");

  const pdfBuffer = await readFile(pdfPath);
  const pdfBase64 = pdfBuffer.toString("base64");

  const prompt = `Você é um orçamentista de construção civil analisando uma proposta comercial de fornecedor em PDF.

TAREFA: Extraia o nome do fornecedor e TODOS os itens de fornecimento com seus valores monetários.

REGRAS DE EXTRAÇÃO DE PREÇOS (CRÍTICO):
1. Propostas brasileiras usam formato "R$ 1.234,56" — o PONTO é separador de milhar e a VÍRGULA é separador decimal
2. Converta para número: "R$ 1.234,56" → 1234.56, "R$ 850,00" → 850.00, "R$ 15.920,00" → 15920.00
3. Procure preços em TODAS as posições: colunas de tabela, ao lado da descrição, em linhas de subtotal, no rodapé
4. Se o PDF tem tabela com colunas (Descrição | Qtd | Und | V.Unit | V.Total), extraia cada coluna
5. Se só tem valor total por item (sem unitário), calcule: preco_unitario = preco_total / quantidade
6. Se só tem valor unitário (sem total), calcule: preco_total = preco_unitario * quantidade
7. NUNCA retorne preco_unitario ou preco_total como null se houver QUALQUER valor monetário associado ao item
8. Valores como "sob consulta", "a combinar" → null com needs_review = true

REGRAS DE EXTRAÇÃO DE ITENS:
- Extraia descrição completa (material + especificação + dimensão quando disponível)
- Unidade: un, m², m³, m, ml, kg, vb, pç, cx, sc, lt, gl, etc.
- Se a proposta tem seções/ambientes (ex: "Cozinha", "Banheiro"), inclua o ambiente na descrição

FORMATO DE SAÍDA (JSON):
{
  "fornecedor": "Nome da empresa fornecedora (razão social ou fantasia)",
  "items": [
    {
      "descricao": "Descrição completa do item",
      "unidade": "un",
      "quantidade": 1.0,
      "preco_unitario": 850.00,
      "preco_total": 850.00,
      "confidence": 0.95,
      "needs_review": false
    }
  ]
}

REGRAS DE CONFIDENCE:
- 0.9-1.0: valor claramente legível na tabela/texto
- 0.7-0.89: valor inferido ou calculado a partir de outros campos
- 0.5-0.69: valor parcialmente legível ou ambíguo → needs_review = true
- < 0.5: chute baseado em contexto → needs_review = true`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "application/pdf",
                  data: pdfBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${text.slice(0, 500)}`);
  }

  const result = await response.json();
  const content = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error("Empty response from Gemini");
  }

  const parsed = JSON.parse(content);
  const validated = ProposalOutputSchema.parse(parsed);

  for (const item of validated.items) {
    if (item.confidence < CONFIDENCE_THRESHOLD) {
      item.needs_review = true;
    }
  }

  return validated;
}
