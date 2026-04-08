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

  const prompt = `Analise este PDF de proposta comercial de fornecedor para construção civil.
Extraia TODOS os itens de fornecimento encontrados.

Para cada item, extraia:
- descricao: descrição do item/serviço
- unidade: unidade de medida (un, m², m³, m, kg, vb, etc.)
- quantidade: quantidade
- preco_unitario: preço unitário em reais
- preco_total: preço total em reais (quantidade × preço unitário)
- confidence: sua confiança na extração (0.0 a 1.0)
- needs_review: true se algum campo estiver incerto

Também identifique o nome do fornecedor.

IMPORTANTE:
- Valores monetários devem ser números (sem R$, sem pontos de milhar)
- Use ponto como separador decimal
- Se um campo não estiver claro, defina confidence < 0.7 e needs_review = true
- Extraia TODOS os itens, mesmo que com baixa confiança

Responda APENAS com JSON válido no formato:
{
  "fornecedor": "Nome do Fornecedor",
  "items": [
    {
      "descricao": "...",
      "unidade": "...",
      "quantidade": 0,
      "preco_unitario": 0,
      "preco_total": 0,
      "confidence": 0.0,
      "needs_review": false
    }
  ]
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
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
